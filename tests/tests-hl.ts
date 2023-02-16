import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { HoneylandStakingContract } from "../target/types/honeyland_staking_contract";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { bundlrStorage, keypairIdentity, Metaplex } from "@metaplex-foundation/js";
import { Metadata } from "@metaplex-foundation/mpl-token-metadata";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { BN } from "bn.js";
import axios from "axios";

let AlphaBeedevNetSecretKey = bs58.decode("5VTe6S12HsXdDQK9xwrozD9XDJS6duQtAS7TDMmhySr5G2CeMhw7Yd6Dpfu2gfpJXHuU3QVSpu5Dwn115qMShFMD");
let AlphaBeedevNetKeypair = Keypair.fromSecretKey(AlphaBeedevNetSecretKey)

let StakeHolderSecretKey = bs58.decode("3fs9GE3KnScEXzdy6sxzW8sQyHrmsSTKPjUC2N5kMZmXMpTvLGDWmJyv23jadhcYz4KNwHbiyMXPLozrEVic1XvC");
let StakeHolderKeypair = Keypair.fromSecretKey(StakeHolderSecretKey)

const provider = anchor.AnchorProvider.env();
const wallet = provider.wallet as anchor.Wallet;
anchor.setProvider(provider);


const STAKE_ENTRY_SEED = "stake-entry";
const STAKE_POOL_SEED = "stake-pool";
const IDENTIFIER_SEED = "identifier";
// const TOKEN_MANAGER_SEED = "token-manager";
// const MINT_COUNTER_SEED = "mint-counter";



const stakeProgram = anchor.workspace.HoneylandStakingContract as Program<HoneylandStakingContract>;
// const ReceiptProgram = anchor.workspace.CardinalReceiptManager as Program<CardinalReceiptManager>;
// const RewardProgram = anchor.workspace.CardinalRewardDistributor as Program<CardinalRewardDistributor>;
const STAKE_POOL_ADDRESS = stakeProgram.programId;
// const TOKEN_MANAGER_ADDRESS = new PublicKey("mgr99QFMYByTqGPWmNqunV7vBLmWWXdSrHUfV8Jf3JM");



export const quickMainConnection = new Connection("https://aged-red-snow.solana-mainnet.quiknode.pro/fb65b51e8c315a67b87c24163f238dce6f5b46c9/");
export const quickDevConnection = new Connection("https://frosty-floral-wind.solana-devnet.quiknode.pro/fa3c7dec03be0b5335ff2905b342eedf94ada834/");

const mxMain = Metaplex.make(quickMainConnection)
    .use(keypairIdentity(AlphaBeedevNetKeypair))

const mxDev = Metaplex.make(quickDevConnection)
    .use(keypairIdentity(AlphaBeedevNetKeypair))
    .use(bundlrStorage({
        address: 'https://devnet.bundlr.network',
        providerUrl: 'https://api.devnet.solana.com',
        timeout: 60000,
    }));

describe("Honeyland Stake Pro Test", () => {

    let stakePoolId: PublicKey;
    // let stakePoolId: PublicKey = new PublicKey("HtFqafRt9FewnF9onmPRgNbqvPZn3FP6pVZBsEaBAsm2");
    const CREATE_STAKE_POOL = false;
    const UPDATE_STAKE_POOL = true;
    const DIRECT_STAKE = false;
    const DIRECT_UNSTAKE = false;
    const STAKE_WITHOUT_NONCE = false;
    const UNSTAKE_WITHOUT_NONCE = false;
    const STAKE_WITH_NONCE = false;
    const UNSTAKE_WITH_NONCE = false;



    let identifierId: PublicKey;
    // let originalMintTokenAccountId: PublicKey;
    // let originalMintId: PublicKey;
    // let newCollectionOriginalMintTokenAccountId: PublicKey;
    // let newCollectionOriginalMintId: PublicKey;
    // let newCreatorOriginalMintTokenAccountId: PublicKey;
    // let newCreatorOriginalMintId: PublicKey;
    let originalMintMetadatId: anchor.web3.PublicKey;
    // let receiptType: ReceiptType = 1;
    // let tokenManagerId: PublicKey;
    // let mintCounterId: PublicKey;
    // let userReceiptMintTokenAccountId: PublicKey;
    let stakeEntryOriginalMintTokenAccountId: PublicKey;
    // let mx: Metaplex;

    it("init stakepool", async () => {
        if (CREATE_STAKE_POOL) {
            // find identifier
            [identifierId] = await anchor.web3.PublicKey.findProgramAddress(
                [anchor.utils.bytes.utf8.encode(IDENTIFIER_SEED)],
                STAKE_POOL_ADDRESS
            );
            console.log("identifier id: ", identifierId.toBase58());
            let identifierData;
            try {
                identifierData = await stakeProgram.account.identifier.fetch(identifierId);
            } catch (error) {
                await stakeProgram.methods.initIdentifier().accounts({
                    identifier: identifierId,
                }).rpc();
            }
            identifierData = await stakeProgram.account.identifier.fetch(identifierId);
            const identifier = identifierData?.count || new anchor.BN(1);
            console.log("stake pool identifier is: ", identifier.toNumber());

            // find stake pool id
            [stakePoolId] = await anchor.web3.PublicKey.findProgramAddress(
                [
                    anchor.utils.bytes.utf8.encode(STAKE_POOL_SEED),
                    identifier.toArrayLike(Buffer, "le", 8),
                ],
                STAKE_POOL_ADDRESS
            );

            // make stake pool
            await stakeProgram.methods.initPool({
                authority: new PublicKey(provider.wallet.publicKey),
                requiresCreators: [],
                requiresCollections: [
                    new PublicKey("BrjmDK2BFXXiF55Ch6Z82W1N7WEQjqow37WbSRJpnxxb"),//land coll
                    new PublicKey("7EvnWDZdYPUSwYvQ4LGJ7feBa3PEBbYmpD9Nvq3i4noP"),//genesis coll
                ],
                imageUri: "",
                resetOnStake: false,
                cooldownSeconds: null,
                minStakeSeconds: 5,
                endDate: null,
                requiresAuthorization: false,
                overlayText: ""
            }).accounts({
                stakePool: stakePoolId,
                identifier: identifierId,
                payer: wallet.publicKey,
            }).signers([
                wallet.payer
            ]).rpc()
            console.log("stake pool id: ", stakePoolId.toBase58());
            console.log("stake pool owner: ", wallet.publicKey.toBase58())
        }
    });

    it("update pool - add new collection", async () => {
        if (UPDATE_STAKE_POOL) {
        // Stake Pool Info Panel(Devnet)
        // identifier id:  GVtCyw2rsKWgUKcVAsx6VZxu282Hh37KsyWvyPL5nsNe
        // stake pool identifier is:  4
        // stake pool id:  EPVNCcJkQ5wN7eZwF9SADiwDVQRpJAVv58HQ4DFD2yPz
        // stake pool owner:  ozM7xJP4cPQjPY1Ar3sWDRsUkekRSdoGw5mU2PFNePA

        const stakePoolId = new PublicKey("EPVNCcJkQ5wN7eZwF9SADiwDVQRpJAVv58HQ4DFD2yPz");

        await stakeProgram.methods.updatePool({
            authority: new PublicKey(provider.wallet.publicKey),
            requiresCreators: [],
            requiresCollections: [
                new PublicKey("BrjmDK2BFXXiF55Ch6Z82W1N7WEQjqow37WbSRJpnxxb"),//land coll
                new PublicKey("7EvnWDZdYPUSwYvQ4LGJ7feBa3PEBbYmpD9Nvq3i4noP"),//genesis coll
                new PublicKey("GTzu75kxdu6vcpaiccou2ZSFTyhrFEJBiEdFh66VtKaj"),//generations coll
                new PublicKey("HqsLosMRWdAgWr4aPgSayRDeCfZtKHJE6XemhahGCJh2"),//pass coll
                new PublicKey("23jCSkRTycKTjrvAUqy2Mpez3Wan618eEerydFDGND5m"),//mad honey(items) coll
            ],
            imageUri: "",
            resetOnStake: false,
            cooldownSeconds: null,
            minStakeSeconds: 5,
            endDate: null,
            requiresAuthorization: false,
            overlayText: "",
        }).accounts({
            stakePool: stakePoolId,
            payer: provider.wallet.publicKey
        }).signers([])
            .rpc();
        }
    });

    it("stake DIRECT", async () => {
        if(DIRECT_STAKE){
        // Stake Pool Info Panel(Devnet)
        // identifier id:  GVtCyw2rsKWgUKcVAsx6VZxu282Hh37KsyWvyPL5nsNe
        // stake pool identifier is:  4
        // stake pool id:  EPVNCcJkQ5wN7eZwF9SADiwDVQRpJAVv58HQ4DFD2yPz
        // stake pool owner:  ozM7xJP4cPQjPY1Ar3sWDRsUkekRSdoGw5mU2PFNePA

        const stakePoolId = new PublicKey("EPVNCcJkQ5wN7eZwF9SADiwDVQRpJAVv58HQ4DFD2yPz");
        const originalMintId = new PublicKey("Gzco73g24yFYT21CZDHFbVQ1KCdF7oES1rAL8xiRF8zg");
        const originalMintTokenAccountId = (
            await mxDev.connection.getTokenAccountsByOwner(
                StakeHolderKeypair.publicKey,
              {
                mint: originalMintId,
              }
            )
          ).value[0];

        let transaction = new Transaction();
        const [stakeEntryId] = await anchor.web3.PublicKey.findProgramAddress(
            [
                anchor.utils.bytes.utf8.encode(STAKE_ENTRY_SEED),
                stakePoolId.toBuffer(),
                originalMintId.toBuffer(),
                anchor.web3.PublicKey.default.toBuffer(),
            ],
            STAKE_POOL_ADDRESS
        );

        const stakeEntryData = await tryGetAccount(async () => {
            const parsed = await stakeProgram.account.stakeEntry.fetch(stakeEntryId);
            return {
                parsed,
                pubkey: stakeEntryId,
            };
        }
        );

        if (!stakeEntryData) {
            originalMintMetadatId = await Metadata.getPDA(originalMintId);
            transaction.add(
                await stakeProgram.methods.initEntry(StakeHolderKeypair.publicKey).accounts({
                    stakeEntry: stakeEntryId,
                    stakePool: stakePoolId,
                    originalMint: originalMintId,
                    originalMintMetadata: originalMintMetadatId,
                    payer: StakeHolderKeypair.publicKey,
                }).signers([
                    StakeHolderKeypair
                ]).transaction()
            );
        }

        stakeEntryOriginalMintTokenAccountId = await getAssociatedTokenAddress(
            originalMintId,
            stakeEntryId,
            true,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID,
        );

        const account = await provider.connection.getAccountInfo(stakeEntryOriginalMintTokenAccountId);
        if (!account) {
            transaction.add(
                createAssociatedTokenAccountInstruction(
                    StakeHolderKeypair.publicKey,
                    stakeEntryOriginalMintTokenAccountId,
                    stakeEntryId,
                    originalMintId,
                    TOKEN_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID,
                )
            );
        }

        transaction.add(
            await stakeProgram.methods.stake(new BN(1)).accounts({
                stakeEntry: stakeEntryId,
                stakePool: stakePoolId,
                stakeEntryOriginalMintTokenAccount:
                stakeEntryOriginalMintTokenAccountId,
                originalMint: originalMintId,
                user: StakeHolderKeypair.publicKey,
                userOriginalMintTokenAccount: originalMintTokenAccountId?.pubkey,
                tokenProgram: TOKEN_PROGRAM_ID,
            }).signers([
                StakeHolderKeypair
            ]).transaction()
        );

        try {
            transaction.recentBlockhash = (
                await provider.connection.getLatestBlockhash()
            ).blockhash;
            transaction.feePayer = StakeHolderKeypair.publicKey;
            transaction.partialSign(StakeHolderKeypair);
            // transaction = await provider.wallet.signTransaction(transaction)
            const signature = await provider.connection.sendRawTransaction(
                transaction.serialize()
            );
            const latestBlockHash = await provider.connection.getLatestBlockhash();
            const confirmStrategy = {
                blockhash: latestBlockHash.blockhash,
                lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
                signature: signature,
            };
            await provider.connection.confirmTransaction(confirmStrategy);

        } catch (error) {
            console.log(error);
        }
        }
    });

    it("unstake DIRECT", async () => {
        if(DIRECT_UNSTAKE){
        // Stake Pool Info Panel(Devnet)
        // identifier id:  GVtCyw2rsKWgUKcVAsx6VZxu282Hh37KsyWvyPL5nsNe
        // stake pool identifier is:  4
        // stake pool id:  EPVNCcJkQ5wN7eZwF9SADiwDVQRpJAVv58HQ4DFD2yPz
        // stake pool owner:  ozM7xJP4cPQjPY1Ar3sWDRsUkekRSdoGw5mU2PFNePA

        const stakePoolId = new PublicKey("EPVNCcJkQ5wN7eZwF9SADiwDVQRpJAVv58HQ4DFD2yPz");
        const originalMintId = new PublicKey("Gzco73g24yFYT21CZDHFbVQ1KCdF7oES1rAL8xiRF8zg");
        const originalMintTokenAccountId = (
            await mxDev.connection.getTokenAccountsByOwner(
                StakeHolderKeypair.publicKey,
              {
                mint: originalMintId,
              }
            )
          ).value[0];

        await new Promise(resolve => setTimeout(resolve, 10000));
        let transaction = await createUnStakeTransaction(originalMintId, originalMintTokenAccountId?.pubkey as PublicKey, stakePoolId);
        try {
            transaction.recentBlockhash = (
                await provider.connection.getLatestBlockhash()
            ).blockhash;
            transaction.feePayer = StakeHolderKeypair.publicKey;
            transaction.partialSign(StakeHolderKeypair);
            const signature = await provider.connection.sendRawTransaction(
                transaction.serialize()
            );
            const latestBlockHash = await provider.connection.getLatestBlockhash();
            const confirmStrategy = {
                blockhash: latestBlockHash.blockhash,
                lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
                signature: signature,
            };
            await provider.connection.confirmTransaction(confirmStrategy);
        } catch (error) {
            console.log(error);
        }
        } 
    });

    it("stake without nonce", async () => {
        if(STAKE_WITHOUT_NONCE){
            // Stake Pool Info Panel(Devnet)
            // identifier id:  GVtCyw2rsKWgUKcVAsx6VZxu282Hh37KsyWvyPL5nsNe
            // stake pool identifier is:  4
            // stake pool id:  EPVNCcJkQ5wN7eZwF9SADiwDVQRpJAVv58HQ4DFD2yPz
            // stake pool owner:  ozM7xJP4cPQjPY1Ar3sWDRsUkekRSdoGw5mU2PFNePA

            const stakePoolId = new PublicKey("EPVNCcJkQ5wN7eZwF9SADiwDVQRpJAVv58HQ4DFD2yPz");
            const originalMintId = new PublicKey("Gzco73g24yFYT21CZDHFbVQ1KCdF7oES1rAL8xiRF8zg");
            const originalMintTokenAccountId = (
                await mxDev.connection.getTokenAccountsByOwner(
                    StakeHolderKeypair.publicKey,
                {
                    mint: originalMintId,
                }
                )
            ).value[0];

            // await new Promise(resolve => setTimeout(resolve, 5000));
            let transaction = await createStakeTransaction(originalMintId, originalMintTokenAccountId?.pubkey as PublicKey, stakePoolId);
            transaction.feePayer = StakeHolderKeypair.publicKey;
            transaction.partialSign(StakeHolderKeypair);


            const transactionConvertedToBase64 = transaction.serialize().toString("base64");
            // console.log(transactionConvertedToBase64)
            
            const JWTToken = "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJuYW1laWQiOiIxMzkiLCJuYW1lIjoiNGduckF1S2Z3TFhDeTRaS0NXQlZZaTl3VTRxNkt3TkhkSExqUHJyWjdjOUIiLCJuYmYiOjE2NzQ2OTk0MjAsImV4cCI6MTcxMDY5OTQyMCwiaWF0IjoxNjc0Njk5NDIwLCJpc3MiOiJIb25leWxhbmRXZWJTaXRlIiwiYXVkIjoiSG9uZXlsYW5kV2ViU2l0ZSJ9.OcNmiPbke03i4iBVHFTxcGEQl_6FZTmIII6lq-AmCcQbfFDU6vg4QN6vE0d4lOPC1kffgHq-_m9owqlnijW5eQ";

            const api = 'https://api-staging.honey.land/api/v1/UserBlockchain/SendTransactionWithoutNonce';
            await axios.post(api, {transactionType: 'HLStakePro-Stake', transactionBase64: transactionConvertedToBase64}, {headers:{"Authorization" : `Bearer ${JWTToken}`}})
            .then(function (response) {
            // console.log(response.data);
            return response.data;
            })
            .catch(function (error) {
            console.log(error);
            return null;
            });
        }
    });

    it("unstake without nonce", async () => {
        if(UNSTAKE_WITHOUT_NONCE){
            // Stake Pool Info Panel(Devnet)
            // identifier id:  GVtCyw2rsKWgUKcVAsx6VZxu282Hh37KsyWvyPL5nsNe
            // stake pool identifier is:  4
            // stake pool id:  EPVNCcJkQ5wN7eZwF9SADiwDVQRpJAVv58HQ4DFD2yPz
            // stake pool owner:  ozM7xJP4cPQjPY1Ar3sWDRsUkekRSdoGw5mU2PFNePA

            const stakePoolId = new PublicKey("EPVNCcJkQ5wN7eZwF9SADiwDVQRpJAVv58HQ4DFD2yPz");
            const originalMintId = new PublicKey("Gzco73g24yFYT21CZDHFbVQ1KCdF7oES1rAL8xiRF8zg");
            const originalMintTokenAccountId = (
                await mxDev.connection.getTokenAccountsByOwner(
                    StakeHolderKeypair.publicKey,
                {
                    mint: originalMintId,
                }
                )
            ).value[0];

            await new Promise(resolve => setTimeout(resolve, 10000));
            let transaction = await createUnStakeTransaction(originalMintId, originalMintTokenAccountId?.pubkey as PublicKey, stakePoolId);
            transaction.feePayer = StakeHolderKeypair.publicKey;
            transaction.partialSign(StakeHolderKeypair);

            const transactionConvertedToBase64 = transaction.serialize().toString("base64");
            // console.log(transactionConvertedToBase64)

            const JWTToken = "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJuYW1laWQiOiIxMzkiLCJuYW1lIjoiNGduckF1S2Z3TFhDeTRaS0NXQlZZaTl3VTRxNkt3TkhkSExqUHJyWjdjOUIiLCJuYmYiOjE2NzQ2OTk0MjAsImV4cCI6MTcxMDY5OTQyMCwiaWF0IjoxNjc0Njk5NDIwLCJpc3MiOiJIb25leWxhbmRXZWJTaXRlIiwiYXVkIjoiSG9uZXlsYW5kV2ViU2l0ZSJ9.OcNmiPbke03i4iBVHFTxcGEQl_6FZTmIII6lq-AmCcQbfFDU6vg4QN6vE0d4lOPC1kffgHq-_m9owqlnijW5eQ";

            const api = 'https://api-staging.honey.land/api/v1/UserBlockchain/SendTransactionWithoutNonce';
            await axios.post(api, {transactionType: 'HLStakePro-UnStake', transactionBase64: transactionConvertedToBase64}, {headers:{"Authorization" : `Bearer ${JWTToken}`}})
            .then(function (response) {
            // console.log(response.data);
            return response.data;
            })
            .catch(function (error) {
            console.log(error);
            return null;
            });
        }
    });

    it("stake with nonce", async () => {
        if(STAKE_WITH_NONCE){
            // Stake Pool Info Panel(Devnet)
            // identifier id:  GVtCyw2rsKWgUKcVAsx6VZxu282Hh37KsyWvyPL5nsNe
            // stake pool identifier is:  4
            // stake pool id:  EPVNCcJkQ5wN7eZwF9SADiwDVQRpJAVv58HQ4DFD2yPz
            // stake pool owner:  ozM7xJP4cPQjPY1Ar3sWDRsUkekRSdoGw5mU2PFNePA

            const stakePoolId = new PublicKey("EPVNCcJkQ5wN7eZwF9SADiwDVQRpJAVv58HQ4DFD2yPz");
            const originalMintId = new PublicKey("3NPhrY452pGpLtqj3qyFfX1LZaoB935uTnVKheHDrEKu");
            const originalMintTokenAccountId = (
                await mxDev.connection.getTokenAccountsByOwner(
                    StakeHolderKeypair.publicKey,
                {
                    mint: originalMintId,
                }
                )
            ).value[0];

            // await new Promise(resolve => setTimeout(resolve, 5000));
            let transaction = await createStakeTransactionWithNonce(originalMintId, originalMintTokenAccountId?.pubkey as PublicKey, stakePoolId);

            const transactionConvertedToBase64 = transaction.serialize({requireAllSignatures:false,verifySignatures:false}).toString("base64");
            
            const JWTToken = "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJuYW1laWQiOiIxMzkiLCJuYW1lIjoiNGduckF1S2Z3TFhDeTRaS0NXQlZZaTl3VTRxNkt3TkhkSExqUHJyWjdjOUIiLCJuYmYiOjE2NzQ2OTk0MjAsImV4cCI6MTcxMDY5OTQyMCwiaWF0IjoxNjc0Njk5NDIwLCJpc3MiOiJIb25leWxhbmRXZWJTaXRlIiwiYXVkIjoiSG9uZXlsYW5kV2ViU2l0ZSJ9.OcNmiPbke03i4iBVHFTxcGEQl_6FZTmIII6lq-AmCcQbfFDU6vg4QN6vE0d4lOPC1kffgHq-_m9owqlnijW5eQ";

            const api = 'https://api-staging.honey.land/api/v1/UserBlockchain/SendTransaction';
            await axios.post(api, {transactionType: 'HLStakePro-Stake', transactionBase64: transactionConvertedToBase64}, {headers:{"Authorization" : `Bearer ${JWTToken}`}})
            .then(function (response) {
            // console.log(response.data);
            return response.data;
            })
            .catch(function (error) {
            console.log(error);
            return null;
            });
        }
    });

    it("unstake with nonce", async () => {
        if(UNSTAKE_WITH_NONCE){
            // Stake Pool Info Panel(Devnet)
            // identifier id:  GVtCyw2rsKWgUKcVAsx6VZxu282Hh37KsyWvyPL5nsNe
            // stake pool identifier is:  4
            // stake pool id:  EPVNCcJkQ5wN7eZwF9SADiwDVQRpJAVv58HQ4DFD2yPz
            // stake pool owner:  ozM7xJP4cPQjPY1Ar3sWDRsUkekRSdoGw5mU2PFNePA

            const stakePoolId = new PublicKey("EPVNCcJkQ5wN7eZwF9SADiwDVQRpJAVv58HQ4DFD2yPz");
            const originalMintId = new PublicKey("3NPhrY452pGpLtqj3qyFfX1LZaoB935uTnVKheHDrEKu");
            const originalMintTokenAccountId = (
                await mxDev.connection.getTokenAccountsByOwner(
                    StakeHolderKeypair.publicKey,
                {
                    mint: originalMintId,
                }
                )
            ).value[0];

            await new Promise(resolve => setTimeout(resolve, 20000));
            let transaction = await createUnStakeTransactionWithNonce(originalMintId, originalMintTokenAccountId?.pubkey as PublicKey, stakePoolId);

            const transactionConvertedToBase64 = transaction.serialize({requireAllSignatures:false,verifySignatures:false}).toString("base64");
            
            const JWTToken = "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJuYW1laWQiOiIxMzkiLCJuYW1lIjoiNGduckF1S2Z3TFhDeTRaS0NXQlZZaTl3VTRxNkt3TkhkSExqUHJyWjdjOUIiLCJuYmYiOjE2NzQ2OTk0MjAsImV4cCI6MTcxMDY5OTQyMCwiaWF0IjoxNjc0Njk5NDIwLCJpc3MiOiJIb25leWxhbmRXZWJTaXRlIiwiYXVkIjoiSG9uZXlsYW5kV2ViU2l0ZSJ9.OcNmiPbke03i4iBVHFTxcGEQl_6FZTmIII6lq-AmCcQbfFDU6vg4QN6vE0d4lOPC1kffgHq-_m9owqlnijW5eQ";

            const api = 'https://api-staging.honey.land/api/v1/UserBlockchain/SendTransaction';
            await axios.post(api, {transactionType: 'HLStakePro-UnStake', transactionBase64: transactionConvertedToBase64}, {headers:{"Authorization" : `Bearer ${JWTToken}`}})
            .then(function (response) {
            // console.log(response.data);
            return response.data;
            })
            .catch(function (error) {
            console.log(error);
            return null;
            });
        }
    });
});



export type AccountData<T> = {
    pubkey: PublicKey;
    parsed: T;
};
type AccountFn<T> = () => Promise<AccountData<T>>;
export async function tryGetAccount<T>(fn: AccountFn<T>) {
    try {
        return await fn();
    } catch {
        return null;
    }
}

async function createStakeTransaction(nftMintId: PublicKey, nftMintTokenAccountId: PublicKey, stakePoolId: PublicKey,): Promise<Transaction> {
    let transaction = new Transaction();
    transaction.recentBlockhash = (
    await provider.connection.getLatestBlockhash('finalized')
    ).blockhash;
    const [stakeEntryId] = await anchor.web3.PublicKey.findProgramAddress(
        [
            anchor.utils.bytes.utf8.encode(STAKE_ENTRY_SEED),
            stakePoolId.toBuffer(),
            nftMintId.toBuffer(),
            anchor.web3.PublicKey.default.toBuffer(),
        ],
        STAKE_POOL_ADDRESS
    );

    const stakeEntryData = await tryGetAccount(async () => {
        const parsed = await stakeProgram.account.stakeEntry.fetch(stakeEntryId);
        return {
            parsed,
            pubkey: stakeEntryId,
        };
    }
    );

    if (!stakeEntryData) {
        let originalMintMetadatId = await Metadata.getPDA(nftMintId);
        transaction.add(
            await stakeProgram.methods.initEntry(StakeHolderKeypair.publicKey).accounts({
                stakeEntry: stakeEntryId,
                stakePool: stakePoolId,
                originalMint: nftMintId,
                originalMintMetadata: originalMintMetadatId,
                payer: StakeHolderKeypair.publicKey,
            }).signers([
                StakeHolderKeypair
            ]).transaction()
        );
    }

    let stakeEntryOriginalMintTokenAccountId = await getAssociatedTokenAddress(
        nftMintId,
        stakeEntryId,
        true,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    const account = await provider.connection.getAccountInfo(stakeEntryOriginalMintTokenAccountId);
    if (!account) {
        transaction.add(
            createAssociatedTokenAccountInstruction(
                StakeHolderKeypair.publicKey,
                stakeEntryOriginalMintTokenAccountId,
                stakeEntryId,
                nftMintId,
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID,
            )
        );
    }

    transaction.add(
        await stakeProgram.methods.stake(new BN(1)).accounts({
            stakeEntry: stakeEntryId,
            stakePool: stakePoolId,
            stakeEntryOriginalMintTokenAccount:
                stakeEntryOriginalMintTokenAccountId,
            originalMint: nftMintId,
            user: StakeHolderKeypair.publicKey,
            userOriginalMintTokenAccount: nftMintTokenAccountId,
            tokenProgram: TOKEN_PROGRAM_ID,
        }).signers([
            StakeHolderKeypair
        ]).transaction()
    );
    return transaction;
}

async function createStakeTransactionWithNonce(nftMintId: PublicKey, nftMintTokenAccountId: PublicKey, stakePoolId: PublicKey,): Promise<Transaction> {
    let transaction = new Transaction();

    //get nonce from server
    const JWTToken = "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJuYW1laWQiOiIxMzkiLCJuYW1lIjoiNGduckF1S2Z3TFhDeTRaS0NXQlZZaTl3VTRxNkt3TkhkSExqUHJyWjdjOUIiLCJuYmYiOjE2NzQ2OTk0MjAsImV4cCI6MTcxMDY5OTQyMCwiaWF0IjoxNjc0Njk5NDIwLCJpc3MiOiJIb25leWxhbmRXZWJTaXRlIiwiYXVkIjoiSG9uZXlsYW5kV2ViU2l0ZSJ9.OcNmiPbke03i4iBVHFTxcGEQl_6FZTmIII6lq-AmCcQbfFDU6vg4QN6vE0d4lOPC1kffgHq-_m9owqlnijW5eQ";

    const api = 'https://api-staging.honey.land/api/v1/UserBlockchain/GetNonceAccount';
    let nonce = await axios.get(api, {headers:{"Authorization" : `Bearer ${JWTToken}`}})
    .then(function (response) {
    // console.log(response.data);
    return response.data;
    })
    .catch(function (error) {
    console.log(error);
    return null;
    });

    // assign `nonce` as recentBlockhash
    transaction.recentBlockhash = nonce.data.blockHash;

    transaction
    .add(
        // nonce advance must be the first insturction
        SystemProgram.nonceAdvance({
          noncePubkey: new PublicKey(nonce.data.nonceAccount),
          authorizedPubkey: new PublicKey(nonce.data.nonceAuthority),
        })
      );

    const [stakeEntryId] = await anchor.web3.PublicKey.findProgramAddress(
        [
            anchor.utils.bytes.utf8.encode(STAKE_ENTRY_SEED),
            stakePoolId.toBuffer(),
            nftMintId.toBuffer(),
            anchor.web3.PublicKey.default.toBuffer(),
        ],
        STAKE_POOL_ADDRESS
    );

    const stakeEntryData = await tryGetAccount(async () => {
        const parsed = await stakeProgram.account.stakeEntry.fetch(stakeEntryId);
        return {
            parsed,
            pubkey: stakeEntryId,
        };
    }
    );

    if (!stakeEntryData) {
        let originalMintMetadatId = await Metadata.getPDA(nftMintId);
        transaction.add(
            await stakeProgram.methods.initEntry(StakeHolderKeypair.publicKey).accounts({
                stakeEntry: stakeEntryId,
                stakePool: stakePoolId,
                originalMint: nftMintId,
                originalMintMetadata: originalMintMetadatId,
                payer: StakeHolderKeypair.publicKey,
            }).signers([
                StakeHolderKeypair
            ]).transaction()
        );
    }

    let stakeEntryOriginalMintTokenAccountId = await getAssociatedTokenAddress(
        nftMintId,
        stakeEntryId,
        true,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    const account = await provider.connection.getAccountInfo(stakeEntryOriginalMintTokenAccountId);
    if (!account) {
        transaction.add(
            createAssociatedTokenAccountInstruction(
                StakeHolderKeypair.publicKey,
                stakeEntryOriginalMintTokenAccountId,
                stakeEntryId,
                nftMintId,
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID,
            )
        );
    }

    transaction.add(
        await stakeProgram.methods.stake(new BN(1)).accounts({
            stakeEntry: stakeEntryId,
            stakePool: stakePoolId,
            stakeEntryOriginalMintTokenAccount:
            stakeEntryOriginalMintTokenAccountId,
            originalMint: nftMintId,
            user: StakeHolderKeypair.publicKey,
            userOriginalMintTokenAccount: nftMintTokenAccountId,
            tokenProgram: TOKEN_PROGRAM_ID,
        }).signers([
            StakeHolderKeypair
        ]).transaction()
    );

    transaction.feePayer = StakeHolderKeypair.publicKey;
    transaction.partialSign(
    StakeHolderKeypair
    );

    return transaction;
}


async function createUnStakeTransaction(nftMintId: PublicKey, nftMintTokenAccountId: PublicKey, stakePoolId: PublicKey,): Promise<Transaction> {
    let transaction = new Transaction();

    transaction.recentBlockhash = (await provider.connection.getLatestBlockhash('finalized')).blockhash;

    const [stakeEntryId] = await anchor.web3.PublicKey.findProgramAddress(
        [
            anchor.utils.bytes.utf8.encode(STAKE_ENTRY_SEED),
            stakePoolId.toBuffer(),
            nftMintId.toBuffer(),
            anchor.web3.PublicKey.default.toBuffer(),
        ],
        STAKE_POOL_ADDRESS
    );

    const associatedAddress = await getAssociatedTokenAddress(
        nftMintId,
        stakeEntryId,
        true,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    // unstake nft
    transaction.add(
        await stakeProgram.methods.unstake().accounts({
            stakeEntry: stakeEntryId,
            stakePool: stakePoolId,
            stakeEntryOriginalMintTokenAccount: associatedAddress,
            originalMint: nftMintId,
            userOriginalMintTokenAccount: nftMintTokenAccountId,
            user: StakeHolderKeypair.publicKey
        }).signers([
            StakeHolderKeypair
        ]).transaction()
    );

    return transaction;
}

async function createUnStakeTransactionWithNonce(nftMintId: PublicKey, nftMintTokenAccountId: PublicKey, stakePoolId: PublicKey,): Promise<Transaction> {
    let transaction = new Transaction();

    //get nonce from server
    const JWTToken = "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJuYW1laWQiOiIxMzkiLCJuYW1lIjoiNGduckF1S2Z3TFhDeTRaS0NXQlZZaTl3VTRxNkt3TkhkSExqUHJyWjdjOUIiLCJuYmYiOjE2NzQ2OTk0MjAsImV4cCI6MTcxMDY5OTQyMCwiaWF0IjoxNjc0Njk5NDIwLCJpc3MiOiJIb25leWxhbmRXZWJTaXRlIiwiYXVkIjoiSG9uZXlsYW5kV2ViU2l0ZSJ9.OcNmiPbke03i4iBVHFTxcGEQl_6FZTmIII6lq-AmCcQbfFDU6vg4QN6vE0d4lOPC1kffgHq-_m9owqlnijW5eQ";

    const api = 'https://api-staging.honey.land/api/v1/UserBlockchain/GetNonceAccount';
    let nonce = await axios.get(api, {headers:{"Authorization" : `Bearer ${JWTToken}`}})
    .then(function (response) {
    // console.log(response.data);
    return response.data;
    })
    .catch(function (error) {
    console.log(error);
    return null;
    });

    // assign `nonce` as recentBlockhash
    transaction.recentBlockhash = nonce.data.blockHash;

    transaction
    .add(
        // nonce advance must be the first insturction
        SystemProgram.nonceAdvance({
          noncePubkey: new PublicKey(nonce.data.nonceAccount),
          authorizedPubkey: new PublicKey(nonce.data.nonceAuthority),
        })
      );

    const [stakeEntryId] = await anchor.web3.PublicKey.findProgramAddress(
        [
            anchor.utils.bytes.utf8.encode(STAKE_ENTRY_SEED),
            stakePoolId.toBuffer(),
            nftMintId.toBuffer(),
            anchor.web3.PublicKey.default.toBuffer(),
        ],
        STAKE_POOL_ADDRESS
    );

    const associatedAddress = await getAssociatedTokenAddress(
        nftMintId,
        stakeEntryId,
        true,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    // unstake nft
    transaction.add(
        await stakeProgram.methods.unstake().accounts({
            stakeEntry: stakeEntryId,
            stakePool: stakePoolId,
            stakeEntryOriginalMintTokenAccount: associatedAddress,
            originalMint: nftMintId,
            userOriginalMintTokenAccount: nftMintTokenAccountId,
            user: StakeHolderKeypair.publicKey
        }).signers([
            StakeHolderKeypair
        ]).transaction()
    );

    transaction.feePayer = StakeHolderKeypair.publicKey;
    transaction.partialSign(
    StakeHolderKeypair
    );

    return transaction;
}

async function sendTransaction(transaction: Transaction) {
    try {
        console.log("in transaction");
        
        transaction.recentBlockhash = (
            await provider.connection.getLatestBlockhash()
        ).blockhash;
        transaction.feePayer = AlphaBeedevNetKeypair.publicKey;
        transaction.partialSign(AlphaBeedevNetKeypair);
        const signature = await provider.connection.sendRawTransaction(
            transaction.serialize()
        );
        const latestBlockHash = await provider.connection.getLatestBlockhash();
        const confirmStrategy = {
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            signature: signature,
        };
        await provider.connection.confirmTransaction(confirmStrategy);
    } catch (error) {
        console.log(error);
    }
}


