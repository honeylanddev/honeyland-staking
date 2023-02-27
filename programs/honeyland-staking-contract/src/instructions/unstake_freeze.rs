use anchor_spl::token::{revoke, Revoke};
use mpl_token_metadata::instruction::thaw_delegated_account;
use solana_program::program::invoke_signed;

use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    anchor_spl::token::{self, Mint, Token, TokenAccount},
};

#[derive(Accounts)]
pub struct UnstakeFreezeCtx<'info> {
    #[account(mut)]
    stake_pool: Box<Account<'info, StakePool>>,
    #[account(mut, constraint = stake_entry.pool == stake_pool.key() @ ErrorCode::InvalidStakePool)]
    stake_entry: Box<Account<'info, StakeEntry>>,
    #[account(constraint = original_mint.key() == stake_entry.original_mint @ ErrorCode::InvalidOriginalMint)]
    original_mint: Box<Account<'info, Mint>>,

    // user
    #[account(mut, constraint = user.key() == stake_entry.last_staker @ ErrorCode::InvalidUnstakeUser)]
    user: Signer<'info>,
    #[account(mut, constraint =
        user_original_mint_token_account.mint == stake_entry.original_mint
        && user_original_mint_token_account.owner == user.key()
        @ ErrorCode::InvalidUserOriginalMintTokenAccount)]
    user_original_mint_token_account: Box<Account<'info, TokenAccount>>,
    /// CHECK: We're about to create this with Metaplex
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,
    /// CHECK: Metaplex will check this
    pub token_metadata_program: UncheckedAccount<'info>,
    // programs
    token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<UnstakeFreezeCtx>) -> Result<()> {
    let stake_pool = &mut ctx.accounts.stake_pool;
    let stake_entry = &mut ctx.accounts.stake_entry;

    let original_mint = stake_entry.original_mint;
    let user = ctx.accounts.user.key();
    let stake_pool_key = stake_pool.key();
    let seed = get_stake_seed(ctx.accounts.original_mint.supply, user);

    let stake_entry_seed = [
        STAKE_ENTRY_PREFIX.as_bytes(),
        stake_pool_key.as_ref(),
        original_mint.as_ref(),
        seed.as_ref(),
        &[stake_entry.bump],
    ];
    let stake_entry_signer = &[&stake_entry_seed[..]];

    if ctx.accounts.token_metadata_program.key() != mpl_token_metadata::id() {
        return Err(error!(ErrorCode::TokenMetadataProgramMismatch));
    }
    if stake_pool.min_stake_seconds.is_some()
        && stake_pool.min_stake_seconds.unwrap() > 0
        && ((Clock::get().unwrap().unix_timestamp - stake_entry.last_staked_at) as u32)
            < stake_pool.min_stake_seconds.unwrap()
    {
        return Err(error!(ErrorCode::MinStakeSecondsNotSatisfied));
    }

    if stake_pool.cooldown_seconds.is_some() && stake_pool.cooldown_seconds.unwrap() > 0 {
        if stake_entry.cooldown_start_seconds.is_none() {
            stake_entry.cooldown_start_seconds = Some(Clock::get().unwrap().unix_timestamp);
            return Ok(());
        } else if stake_entry.cooldown_start_seconds.is_some()
            && ((Clock::get().unwrap().unix_timestamp - stake_entry.cooldown_start_seconds.unwrap())
                as u32)
                < stake_pool.cooldown_seconds.unwrap()
        {
            return Err(error!(ErrorCode::CooldownSecondRemaining));
        }
    }

    // If receipt has been minted, ensure it is back in the stake_entry
    // if stake_entry.stake_mint.is_some() {
    //     let remaining_accs = &mut ctx.remaining_accounts.iter();
    //     let stake_entry_receipt_mint_token_account_info = next_account_info(remaining_accs)?;
    //     let stake_entry_receipt_mint_token_account = Account::<TokenAccount>::try_from(stake_entry_receipt_mint_token_account_info)?;
    //     if stake_entry_receipt_mint_token_account.mint != stake_entry.stake_mint.unwrap()
    //         || stake_entry_receipt_mint_token_account.owner != stake_entry.key()
    //         || stake_entry_receipt_mint_token_account.amount == 0
    //     {
    //         return Err(error!(ErrorCode::InvalidStakeEntryStakeTokenAccount));
    //     }
    // }

    // give back original mint to user
    let thaw_ix = thaw_delegated_account(
        mpl_token_metadata::ID,
        stake_entry.key(),
        ctx.accounts.user_original_mint_token_account.key(),
        ctx.accounts.master_edition.key(),
        ctx.accounts.original_mint.key(),
    );
    invoke_signed(
        &thaw_ix,
        &[
            stake_entry.to_account_info(),
            ctx.accounts
                .user_original_mint_token_account
                .to_account_info(),
            ctx.accounts.master_edition.to_account_info(),
            ctx.accounts.original_mint.to_account_info(),
            ctx.accounts.token_metadata_program.to_account_info(),
        ],
        &[&stake_entry_seed[..]],
    )?;

    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_accounts = Revoke {
        source: ctx
            .accounts
            .user_original_mint_token_account
            .to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    revoke(CpiContext::new(cpi_program, cpi_accounts))?;
    
    stake_entry.total_stake_seconds = stake_entry.total_stake_seconds.saturating_add(
        (u128::try_from(
            stake_entry
                .cooldown_start_seconds
                .unwrap_or(Clock::get().unwrap().unix_timestamp),
        )
        .unwrap()
        .saturating_sub(u128::try_from(stake_entry.last_staked_at).unwrap()))
        .checked_mul(u128::try_from(stake_entry.amount).unwrap())
        .unwrap(),
    );
    stake_entry.last_staker = Pubkey::default();
    stake_entry.original_mint_claimed = false;
    stake_entry.stake_mint_claimed = false;
    stake_entry.amount = 0;
    stake_entry.cooldown_start_seconds = None;
    stake_pool.total_staked = stake_pool.total_staked.checked_sub(1).expect("Sub error");
    stake_entry.kind = StakeEntryKind::Permissionless as u8;
    let clock: Clock = Clock::get().unwrap();
    emit!(StakeOrUnstakeEvent {
        authority: ctx.accounts.user.key().to_string(),
        entity_mint: ctx.accounts.original_mint.key().to_string(),
        event_type: String::from("UnStake"),
        time_stamp: clock.unix_timestamp
    });
    Ok(())
}
