use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token;
use anchor_spl::token::Approve;
use anchor_spl::token::Mint;
use anchor_spl::token::Token;
use anchor_spl::token::TokenAccount;
use mpl_token_metadata::instruction::freeze_delegated_account;
use solana_program::program::invoke_signed;

#[derive(Accounts)]
pub struct StakeFreezeCtx<'info> {
    #[account(mut, seeds = [STAKE_ENTRY_PREFIX.as_bytes(), stake_entry.pool.as_ref(), stake_entry.original_mint.as_ref(), get_stake_seed(original_mint.supply, user.key()).as_ref()], bump=stake_entry.bump)]
    stake_entry: Box<Account<'info, StakeEntry>>,

    #[account(mut, constraint = stake_entry.pool == stake_pool.key() @ ErrorCode::InvalidStakePool)]
    stake_pool: Box<Account<'info, StakePool>>,

    #[account(constraint = original_mint.key() == stake_entry.original_mint @ ErrorCode::InvalidOriginalMint)]
    original_mint: Box<Account<'info, Mint>>,

    // // stake_entry token accounts
    // #[account(mut, constraint =
    //     stake_entry_original_mint_token_account.mint == stake_entry.original_mint
    //     && stake_entry_original_mint_token_account.owner == stake_entry.key()
    //     @ ErrorCode::InvalidStakeEntryOriginalMintTokenAccount
    // )]
    // stake_entry_original_mint_token_account: Box<Account<'info, TokenAccount>>,

    // user
    #[account(mut)]
    user: Signer<'info>,
    #[account(mut, constraint =
        user_original_mint_token_account.amount > 0
        && user_original_mint_token_account.mint == stake_entry.original_mint
        && user_original_mint_token_account.owner == user.key()
        @ ErrorCode::InvalidUserOriginalMintTokenAccount
    )]
    user_original_mint_token_account: Box<Account<'info, TokenAccount>>,
    /// CHECK: We're about to create this with Metaplex
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,
    // programs
    token_program: Program<'info, Token>,
    associated_token_program: Program<'info, AssociatedToken>,
    /// CHECK: Metaplex will check this
    pub token_metadata_program: UncheckedAccount<'info>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<StakeFreezeCtx>, amount: u64) -> Result<()> {
    let stake_entry = &mut ctx.accounts.stake_entry;
    let original_mint = stake_entry.original_mint;
    let user = ctx.accounts.user.key();
    let stake_pool = &mut ctx.accounts.stake_pool;
    let seed = get_stake_seed(ctx.accounts.original_mint.supply, user);

    if stake_pool.end_date.is_some()
        && Clock::get().unwrap().unix_timestamp > stake_pool.end_date.unwrap()
    {
        return Err(error!(ErrorCode::StakePoolHasEnded));
    }

    if stake_entry.amount != 0 {
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
        stake_entry.cooldown_start_seconds = None;
    }

    let stake_pool_key = stake_pool.key();

    let seeds = &[
        STAKE_ENTRY_PREFIX.as_bytes(),
        stake_pool_key.as_ref(),
        original_mint.as_ref(),
        seed.as_ref(),
        &[stake_entry.bump],
    ];

    // transfer amount to recipient token account
    // edition will be validated by metadata_program
    // assert_keys_eq!(metadata_program.key, mpl_token_metadata::id());
    if ctx.accounts.token_metadata_program.key() != mpl_token_metadata::id() {
        return Err(error!(ErrorCode::TokenMetadataProgramMismatch));
    }
    // set account delegate of recipient token account to stake entry PDA
    let cpi_accounts = Approve {
        to: ctx
            .accounts
            .user_original_mint_token_account
            .to_account_info(),
        delegate: stake_entry.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
    token::approve(cpi_context, amount)?;

    let freeze_ix = freeze_delegated_account(
        mpl_token_metadata::ID,
        stake_entry.key(),
        ctx.accounts.user_original_mint_token_account.key(),
        ctx.accounts.master_edition.key(),
        ctx.accounts.original_mint.key(),
    );
    invoke_signed(
        &freeze_ix,
        &[
            stake_entry.to_account_info(),
            ctx.accounts
                .user_original_mint_token_account
                .to_account_info(),
            ctx.accounts.master_edition.to_account_info(),
            ctx.accounts.original_mint.to_account_info(),
            ctx.accounts.token_metadata_program.to_account_info(),
        ],
        &[&seeds[..]],
    )?;

    if stake_pool.reset_on_stake && stake_entry.amount == 0 {
        stake_entry.total_stake_seconds = 0;
    }

    stake_entry.last_staked_at = Clock::get().unwrap().unix_timestamp;
    stake_entry.last_staker = ctx.accounts.user.key();
    stake_entry.amount = stake_entry.amount.checked_add(amount).unwrap();
    stake_pool.total_staked = stake_pool.total_staked.checked_add(1).expect("Add error");
    let clock: Clock = Clock::get().unwrap();
    emit!(StakeOrUnstakeEvent {
        authority: ctx.accounts.user.key().to_string(),
        entity_mint: ctx.accounts.original_mint.key().to_string(),
        event_type: String::from("Stake"),
        time_stamp: clock.unix_timestamp
    });
    Ok(())
}
