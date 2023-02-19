use {crate::state::*, anchor_lang::prelude::*, crate::errors::ErrorCode};

#[derive(Accounts)]
pub struct InitIdentifierCtx<'info> {
    #[account(
        init,
        payer = payer,
        space = IDENTIFIER_SIZE,
        seeds = [IDENTIFIER_PREFIX.as_bytes()],
        bump
    )]
    identifier: Account<'info, Identifier>,

    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitIdentifierCtx>) -> Result<()> {
    // if ctx.accounts.payer.key().to_string() != String::from("AL7oq2WvqHAMQj5E2QCEMXgtvtbqDZnVg2tJ6s94WdLu") {
    //     return Err(error!(ErrorCode::WrongAuthOrPayer));
    // }
    let identifier = &mut ctx.accounts.identifier;
    identifier.bump = *ctx.bumps.get("identifier").unwrap();
    identifier.count = 1;

    Ok(())
}
