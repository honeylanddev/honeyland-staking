import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { HoneylandStakingContract } from "../target/types/honeyland_staking_contract";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { bundlrStorage, keypairIdentity, Metaplex, mockStorage } from "@metaplex-foundation/js";
import { Metadata } from "@metaplex-foundation/mpl-token-metadata";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { BN } from "bn.js";
import { program } from "@project-serum/anchor/dist/cjs/spl/associated-token";
let AlphaBeedevNetSecretKey = bs58.decode("5VTe6S12HsXdDQK9xwrozD9XDJS6duQtAS7TDMmhySr5G2CeMhw7Yd6Dpfu2gfpJXHuU3QVSpu5Dwn115qMShFMD");
let AlphaBeedevNetKeypair = Keypair.fromSecretKey(AlphaBeedevNetSecretKey)
console.log(AlphaBeedevNetKeypair.publicKey.toBase58());

const provider = anchor.AnchorProvider.env()

const endpoint = "https://frosty-floral-wind.solana-devnet.quiknode.pro/fa3c7dec03be0b5335ff2905b342eedf94ada834/";
const quickConnection = new Connection(endpoint);


anchor.setProvider(provider);
const STAKE_ENTRY_SEED = "stake-entry";
const STAKE_POOL_SEED = "stake-pool";
const IDENTIFIER_SEED = "identifier";
const TOKEN_MANAGER_SEED = "token-manager";
const MINT_COUNTER_SEED = "mint-counter";



const stakeProgram = anchor.workspace.HoneylandStakingContract as Program<HoneylandStakingContract>;
const STAKE_POOL_ADDRESS = stakeProgram.programId;
const TOKEN_MANAGER_ADDRESS = new PublicKey("mgr99QFMYByTqGPWmNqunV7vBLmWWXdSrHUfV8Jf3JM");
0
describe("testing-cardinal", () => {

    let stakePoolId: PublicKey;
    // let stakePoolId: PublicKey = new PublicKey("HtFqafRt9FewnF9onmPRgNbqvPZn3FP6pVZBsEaBAsm2");
    const CREATE_STAKE_POOL = true;


    let identifierId: PublicKey;
    let originalMintTokenAccountId: PublicKey;
    let originalMintId: PublicKey;
    let newCollectionOriginalMintTokenAccountId: PublicKey;
    let newCollectionOriginalMintId: PublicKey;
    let newCreatorOriginalMintTokenAccountId: PublicKey;
    let newCreatorOriginalMintId: PublicKey;
    let originalMintMetadatId: anchor.web3.PublicKey;
    let receiptType: ReceiptType = 1;
    let tokenManagerId: PublicKey;
    let mintCounterId: PublicKey;
    let userReceiptMintTokenAccountId: PublicKey;
    let stakeEntryOriginalMintTokenAccountId: PublicKey;
    let mx: Metaplex;
    let originalCollectionMint: PublicKey;
    let secondaryCollectionMint: PublicKey;


    it("making collections for tests", async () => {
        // mx = new Metaplex(provider.connection).use(bundlrStorage({
        //     address: 'https://devnet.bundlr.network',
        //     providerUrl: 'https://api.devnet.solana.com',
        //     timeout: 60000,
        // })).use(keypairIdentity(AlphaBeedevNetKeypair as anchor.web3.Keypair));
        mx = new Metaplex(provider.connection).use(keypairIdentity(AlphaBeedevNetKeypair as anchor.web3.Keypair)).use(mockStorage());
        let nftCollection = await mx.nfts().create({
            name: "Cl1",
            sellerFeeBasisPoints: 410,
            uri: "",
            symbol: 'CLL',
            isCollection: true
        }).run();
        originalCollectionMint = nftCollection.mintAddress;
        nftCollection = await mx.nfts().create({
            name: "Cl2",
            sellerFeeBasisPoints: 410,
            uri: "",
            symbol: 'CLL',
            isCollection: true
        }).run();
        secondaryCollectionMint = nftCollection.mintAddress;

    });

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
            console.log("identifier is: ", identifier.toNumber());

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
                    // new PublicKey("9VXBFkSnCHvsEB2P32MRDkye6zSDpLNepJLjPLeVMTX4")
                    originalCollectionMint
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
                payer: AlphaBeedevNetKeypair.publicKey,
            }).signers([
                AlphaBeedevNetKeypair
            ]).rpc()
            console.log("stake pool id: ", stakePoolId.toBase58());
        }
    });

    it("Make nfts for testing", async () => {
        // make nft 
        let { nft } = await mx.nfts().create({
            uri: "",
            name: "nftN1",
            sellerFeeBasisPoints: 100,
            // collection: new PublicKey("9VXBFkSnCHvsEB2P32MRDkye6zSDpLNepJLjPLeVMTX4"),
            collection: originalCollectionMint,
            collectionAuthority: AlphaBeedevNetKeypair
        }).run()
        originalMintId = nft.mint.address;
        originalMintTokenAccountId = nft.token.address;
        console.log("made nft: ", nft.address.toBase58());
        console.log("made nft token account", originalMintTokenAccountId.toBase58());
    })

    it("stake!", async () => {
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
                await stakeProgram.methods.initEntry(AlphaBeedevNetKeypair.publicKey).accounts({
                    stakeEntry: stakeEntryId,
                    stakePool: stakePoolId,
                    originalMint: originalMintId,
                    originalMintMetadata: originalMintMetadatId,
                    payer: AlphaBeedevNetKeypair.publicKey,
                }).signers([
                    AlphaBeedevNetKeypair
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
                    AlphaBeedevNetKeypair.publicKey,
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
                user: AlphaBeedevNetKeypair.publicKey,
                userOriginalMintTokenAccount: originalMintTokenAccountId,
                tokenProgram: TOKEN_PROGRAM_ID,
            }).signers([
                AlphaBeedevNetKeypair
            ]).transaction()
        );
        ////////////// Reciepts (not working) /////////////////
        /*
        if (receiptType && receiptType !== ReceiptType.None) {
            const receiptMintId = originalMintId;
            if (!receiptMintId) {
                throw new Error(
                    "Stake entry has no stake mint. Initialize stake mint first."
                );
            }
            if (
                stakeEntryData?.parsed.stakeMintClaimed ||
                stakeEntryData?.parsed.originalMintClaimed
            ) {
                throw new Error("Receipt has already been claimed.");
            }

            if (
                !stakeEntryData?.parsed ||
                stakeEntryData.parsed.amount.toNumber() === 0
            ) {
                // Finds the token manager address for a given mint and mint counter
                [tokenManagerId] = await PublicKey.findProgramAddress(
                    [anchor.utils.bytes.utf8.encode(TOKEN_MANAGER_SEED), originalMintId.toBuffer()],
                    TOKEN_MANAGER_ADDRESS
                );
                console.log("token manager address: ", tokenManagerId.toBase58());

                let tokenManagerReceiptMintTokenAccountId = await getAssociatedTokenAddress(
                    originalMintId,
                    tokenManagerId,
                    true,
                    TOKEN_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID,
                );
                const account = await provider.connection.getAccountInfo(tokenManagerReceiptMintTokenAccountId);
                if (!account) {

                    transaction.add(
                        createAssociatedTokenAccountInstruction(
                            AlphaBeedevNetKeypair.publicKey,
                            tokenManagerReceiptMintTokenAccountId,
                            tokenManagerId,
                            originalMintId,
                            TOKEN_PROGRAM_ID,
                            ASSOCIATED_TOKEN_PROGRAM_ID,
                        )
                    );
                }

                // Finds the mint counter id
                [mintCounterId] = await PublicKey.findProgramAddress(
                    [anchor.utils.bytes.utf8.encode(MINT_COUNTER_SEED), receiptMintId.toBuffer()],
                    TOKEN_MANAGER_ADDRESS
                );
                console.log(mintCounterId.toBase58());
                console.log(originalMintId.toBase58());

                userReceiptMintTokenAccountId = await getAssociatedTokenAddress(
                    originalMintId,
                    AlphaBeedevNetKeypair.publicKey,
                    true,
                    TOKEN_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID,
                );

                transaction.add(
                    await stakeProgram.methods.claimReceiptMint().accounts({
                        stakeEntry: stakeEntryId,
                        originalMint: originalMintId,
                        receiptMint: receiptMintId,
                        stakeEntryReceiptMintTokenAccount: stakeEntryOriginalMintTokenAccountId,
                        user: AlphaBeedevNetKeypair.publicKey,
                        userReceiptMintTokenAccount: userReceiptMintTokenAccountId,
                        mintCounter: mintCounterId,
                        tokenManager: tokenManagerId,
                        tokenManagerReceiptMintTokenAccount: tokenManagerReceiptMintTokenAccountId,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        tokenManagerProgram: TOKEN_MANAGER_ADDRESS,
                        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    }).signers([
                        AlphaBeedevNetKeypair
                    ]).transaction()
                );
            }
        }
        */

        try {
            transaction.recentBlockhash = (
                await provider.connection.getLatestBlockhash()
            ).blockhash;
            transaction.feePayer = AlphaBeedevNetKeypair.publicKey;
            transaction.partialSign(AlphaBeedevNetKeypair);
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
            // for (let index = 0; index < transactions.length; index++) {
            //     let transaction = transactions[index];
            //     if (transaction) {
            //         let date = null
            //         if (transaction.blockTime) {
            //             date = new Date(transaction.blockTime * 1000);

            //         }
            //         console.log(`Transaction No: ${index + 1}`);
            //         let transactionResponse = await quickConnection.getTransaction(transaction.signature)
            //         console.log(`Signature: ${transaction.signature}`);
            //         console.log(`Response: ${JSON.stringify(transactionResponse?.transaction.message)}`);
            //         console.log(`Time: ${date}`);
            //         console.log(("-").repeat(20));
            //     }
            // }

            //////////////////////////////////// PARSING THE TRANSACTION ///////////////////////////////

            /*let transactionList = await quickConnection.getSignaturesForAddress(new PublicKey("3uxefCc5RpaeiTqPqfXL3LLJeepsvTwNhfP3xuu3TDjL"));
            let signatureList = transactionList.map(transaction => transaction.signature);
            let transactionDetails = await quickConnection.getParsedTransactions(signatureList, { maxSupportedTransactionVersion: 0 });
            transactionList.forEach((transaction, i) => {
                let date = null
                const transactionLogMessages = transactionDetails[i]?.meta?.logMessages;
                if (transaction.blockTime) {
                    date = new Date(transaction.blockTime * 1000);

                }
                console.log(`Transaction No: ${i + 1}`);
                console.log(`Signature: ${transaction.signature}`);
                console.log(`Time: ${date}`);
                transactionLogMessages?.forEach((log, n) => {
                    console.log(`---transaction log ${n + 1}: ${log}`);
                })
                console.log(("-").repeat(20));
            })*/

        } catch (error) {
            console.log(error);
        }

    });

    it("unstake!", async () => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        let transaction = await createUnStakeTransaction(originalMintId, originalMintTokenAccountId, stakePoolId);
        try {
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

            // //   console.log(" ========== waiting for 30 seconds ========== ");
            // await new Promise(resolve => setTimeout(resolve, 6000));
            // transaction = new Transaction();
            // transaction.add(
            //     await stakeProgram.methods.unstake().accounts({
            //         stakeEntry: stakeEntryId,
            //         stakePool: stakePoolId,
            //         stakeEntryOriginalMintTokenAccount: associatedAddress,
            //         originalMint: originalMintId,
            //         userOriginalMintTokenAccount: originalMintTokenAccountId,
            //         user: AlphaBeedevNetKeypair.publicKey
            //     }).signers([
            //         AlphaBeedevNetKeypair
            //     ]).transaction()
            // );
            // transaction.recentBlockhash = (
            //     await provider.connection.getLatestBlockhash()
            // ).blockhash;
            // transaction.feePayer = AlphaBeedevNetKeypair.publicKey;
            // transaction.partialSign(AlphaBeedevNetKeypair);
            // const signature2 = await provider.connection.sendRawTransaction(
            //     transaction.serialize()
            // );
            // const latestBlockHash2 = await provider.connection.getLatestBlockhash();
            // const confirmStrategy2 = {
            //     blockhash: latestBlockHash2.blockhash,
            //     lastValidBlockHeight: latestBlockHash2.lastValidBlockHeight,
            //     signature: signature2,
            // };
            // await provider.connection.confirmTransaction(confirmStrategy2);
        } catch (error) {
            console.log(error);
        }
    });

    it("update pool - add new collection", async () => {
        await stakeProgram.methods.updatePool({
            authority: new PublicKey(provider.wallet.publicKey),
            requiresCreators: [],
            requiresCollections: [
                originalCollectionMint,
                secondaryCollectionMint
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
    });

    it("make nft for new collection", async () => {
        let { nft } = await mx.nfts().create({
            uri: "",
            name: "nftN2",
            sellerFeeBasisPoints: 100,
            collection: secondaryCollectionMint,
            collectionAuthority: AlphaBeedevNetKeypair
        }).run()
        newCollectionOriginalMintId = nft.mint.address
        newCollectionOriginalMintTokenAccountId = nft.token.address;
        console.log("made nft with new collection: ", nft.address.toBase58());
        console.log("made nft with new collection token account", newCollectionOriginalMintTokenAccountId.toBase58());
    });

    it("stake nft with new collection", async () => {
        let transaction = await createStakeTransaction(newCollectionOriginalMintId, newCollectionOriginalMintTokenAccountId, stakePoolId)
        // let listener = undefined;        
        // let [event, slot] = await new Promise((resolve, _reject) => {
        //     listener = stakeProgram.addEventListener("StakeOrUnstakeEvent", (event, slot) => {
        //         resolve([event, slot]);
        //     });
        //     sendTransaction(transaction);
        // });
        await sendTransaction(transaction);
        // await stakeProgram.removeEventListener(listener);
        // console.log(event);
    });

    it("unstake new nft", async () => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        let transaction = await createUnStakeTransaction(newCollectionOriginalMintId, newCollectionOriginalMintTokenAccountId, stakePoolId);
        // let listener = undefined;        
        // let [event, slot] = await new Promise((resolve, _reject) => {
        //     listener = stakeProgram.addEventListener("StakeOrUnstakeEvent", (event, slot) => {
        //         resolve([event, slot]);
        //     });
        //     sendTransaction(transaction);
        // });
        await sendTransaction(transaction);
        // await stakeProgram.removeEventListener(listener);
        // console.log(event);
    });

    it("update pool - add new creator", async () => {
        await stakeProgram.methods.updatePool({
            authority: new PublicKey(provider.wallet.publicKey),
            requiresCreators: [
                new PublicKey("GtujtKvcfft9UkTGDnFNoZiuqP9t7pTZPLQte6HT8ziP")
            ],
            requiresCollections: [
                originalCollectionMint,
                secondaryCollectionMint
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
    });

    it("make nft with new creator", async () => {
        let { nft } = await mx.nfts().create({
            uri: "",
            name: "nftN3",
            sellerFeeBasisPoints: 100,
        }).run()
        newCreatorOriginalMintId = nft.mint.address;
        newCreatorOriginalMintTokenAccountId = nft.token.address;
        console.log("made nft with new Creator: ", nft.address.toBase58());
        console.log("made nft with new Creator token account", newCollectionOriginalMintId.toBase58());
    });

    it("stake nft with new creator", async () => {
        let transaction = await createStakeTransaction(newCreatorOriginalMintId, newCreatorOriginalMintTokenAccountId, stakePoolId)
        try {
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
    });

    it("unstake nft with new creator", async () => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        let transaction = await createUnStakeTransaction(newCreatorOriginalMintId, newCreatorOriginalMintTokenAccountId, stakePoolId);
        try {
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
    });

    it("unstaking an nft which isn't staked gives error", async () => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        let transaction = await createUnStakeTransaction(newCreatorOriginalMintId, newCreatorOriginalMintTokenAccountId, stakePoolId);
        try {
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
    });

    it("staking an nft which doesn't have valid conditions gives error", async () => {
        let { nft } = await mx.nfts().create({
            uri: "",
            name: "nftN4",
            sellerFeeBasisPoints: 100,
        }).run()
        await mx.nfts().unverifyCreator({
            mintAddress: nft.mint.address
        }).run()
        let newUnvalidOriginalMintId = nft.mint.address;
        let newUnvalidOriginalMintTokenAccountId = nft.token.address;
        console.log("made nft with invalid data: ", nft.address.toBase58());
        console.log("made nft with invalid data token account", newUnvalidOriginalMintTokenAccountId.toBase58());

        let transaction = await createStakeTransaction(newUnvalidOriginalMintId, newUnvalidOriginalMintTokenAccountId, stakePoolId)
        try {
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
    });

    it("fill stake pool with zeroes", async () => {
        await stakeProgram.methods.stakePoolFillZeros().accounts({
            stakePool: stakePoolId
        }).rpc()
        let stakePool = await stakeProgram.account.stakePool.fetch(stakePoolId);
        console.log(stakePool);

    })

    it("close pool", async () => {
        await stakeProgram.methods
            .closeStakePool()
            .accounts({
                stakePool: stakePoolId,
                authority: provider.wallet.publicKey
            })
            .signers([])
            .rpc();
    });

    it("staking nft after pool is closed gives error", async () => {
        let transaction = await createStakeTransaction(newCreatorOriginalMintId, newCreatorOriginalMintTokenAccountId, stakePoolId)
        try {
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

enum ReceiptType {
    // Receive the original mint wrapped in a token manager
    Original = 1,
    // Receive a receipt mint wrapped in a token manager
    Receipt = 2,
    // Receive nothing
    None = 3,
}



async function createStakeTransaction(nftMintId: PublicKey, nftMintTokenAccountId: PublicKey, stakePoolId: PublicKey,): Promise<Transaction> {
    let transaction = new Transaction();
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
            await stakeProgram.methods.initEntry(AlphaBeedevNetKeypair.publicKey).accounts({
                stakeEntry: stakeEntryId,
                stakePool: stakePoolId,
                originalMint: nftMintId,
                originalMintMetadata: originalMintMetadatId,
                payer: AlphaBeedevNetKeypair.publicKey,
            }).signers([
                AlphaBeedevNetKeypair
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
                AlphaBeedevNetKeypair.publicKey,
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
            user: AlphaBeedevNetKeypair.publicKey,
            userOriginalMintTokenAccount: nftMintTokenAccountId,
            tokenProgram: TOKEN_PROGRAM_ID,
        }).signers([
            AlphaBeedevNetKeypair
        ]).transaction()
    );
    return transaction;
}

async function createUnStakeTransaction(nftMintId: PublicKey, nftMintTokenAccountId: PublicKey, stakePoolId: PublicKey,): Promise<Transaction> {
    let transaction = new Transaction();
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
            user: AlphaBeedevNetKeypair.publicKey
        }).signers([
            AlphaBeedevNetKeypair
        ]).transaction()
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