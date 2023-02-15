import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { CardinalStakePool } from "../target/types/cardinal_stake_pool";
import { Connection, PublicKey } from "@solana/web3.js";

const provider = anchor.AnchorProvider.env();
const wallet = provider.wallet as anchor.Wallet;
anchor.setProvider(provider);


const STAKE_POOL_SEED = "stake-pool";
const IDENTIFIER_SEED = "identifier";
// const TOKEN_MANAGER_SEED = "token-manager";
// const MINT_COUNTER_SEED = "mint-counter";



const stakeProgram = anchor.workspace.CardinalStakePool as Program<CardinalStakePool>;
// const ReceiptProgram = anchor.workspace.CardinalReceiptManager as Program<CardinalReceiptManager>;
// const RewardProgram = anchor.workspace.CardinalRewardDistributor as Program<CardinalRewardDistributor>;
const STAKE_POOL_ADDRESS = stakeProgram.programId;
// const TOKEN_MANAGER_ADDRESS = new PublicKey("mgr99QFMYByTqGPWmNqunV7vBLmWWXdSrHUfV8Jf3JM");


export const quickMainConnection = new Connection("https://aged-red-snow.solana-mainnet.quiknode.pro/fb65b51e8c315a67b87c24163f238dce6f5b46c9/");

describe("Honeyland Stake Pro(Mainnet) Test", () => {

    let stakePoolId: PublicKey;
    const CREATE_STAKE_POOL = true;
    const UPDATE_STAKE_POOL = false;

    let identifierId: PublicKey;

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
                    new PublicKey("EcSoa68ijMSR2ZZetvBkCcKk7fWC5paMF7i5kTXRsS2o"),//genesis coll
                    new PublicKey("EbzS14nGAk5c3x5jdFy5smRtv6vPbCq4ddqHpoTx53rs"),//genesis bees coll
                    new PublicKey("8BGW3ATk41Th6qs17abW9PF2bYmRksGrmpvySW8Zy3k2"),//genesis queens coll

                    new PublicKey("8mfX1S3XtS7pjLPcLf8H9xeNuh15v6K4wdxY98YnKymH"),//generations coll
                    new PublicKey("8EAWQhajX3XERKzyXAqNRtMBBMCK8Ccfi6niFHQXJw1m"),//generations bees coll
                    new PublicKey("2SSbQVGgbcyrD3SEdMaRdGqUrcudcEGoHtD7oA9Dtr9G"),//generations queens coll

                    new PublicKey("GLcQE9h8v1yNNvQSssKGMMeU59jutpxk4cN5CMwatvHA"),//land coll
                    new PublicKey("CTXwXX3cbAKf9u1wwPiJei1hJKKvQxYiHagRwjvsvuzA"),//pass coll
                    new PublicKey("GKpax8o418DsU7CYmYSBt8GhAB4s3QnoebTmZWHBoLdK"),//mad honey(items) coll
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
                new PublicKey("EcSoa68ijMSR2ZZetvBkCcKk7fWC5paMF7i5kTXRsS2o"),//genesis coll
                new PublicKey("EbzS14nGAk5c3x5jdFy5smRtv6vPbCq4ddqHpoTx53rs"),//genesis bees coll
                new PublicKey("8BGW3ATk41Th6qs17abW9PF2bYmRksGrmpvySW8Zy3k2"),//genesis queens coll

                new PublicKey("8mfX1S3XtS7pjLPcLf8H9xeNuh15v6K4wdxY98YnKymH"),//generations coll
                new PublicKey("8EAWQhajX3XERKzyXAqNRtMBBMCK8Ccfi6niFHQXJw1m"),//generations bees coll
                new PublicKey("2SSbQVGgbcyrD3SEdMaRdGqUrcudcEGoHtD7oA9Dtr9G"),//generations queens coll
                
                new PublicKey("GLcQE9h8v1yNNvQSssKGMMeU59jutpxk4cN5CMwatvHA"),//land coll
                new PublicKey("CTXwXX3cbAKf9u1wwPiJei1hJKKvQxYiHagRwjvsvuzA"),//pass coll
                new PublicKey("GKpax8o418DsU7CYmYSBt8GhAB4s3QnoebTmZWHBoLdK"),//mad honey(items) coll
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

});


