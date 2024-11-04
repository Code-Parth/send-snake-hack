import fs from "fs";
import bs58 from "bs58";
import axios from "axios";
import {
    Connection,
    Transaction,
    Keypair,
    VersionedTransaction
} from "@solana/web3.js";

const winnerArrayNumber = [4, 14, 18, 24, 34, 42, 44, 48, 49];
const POLLING_INTERVAL = 5000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com";
const connection = new Connection(SOLANA_RPC_URL, "confirmed");

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const privateKeyString = fs.readFileSync("PRIVATE_KEY", "utf-8").trim();
const privateKeyBytes = bs58.decode(privateKeyString);
const wallet = Keypair.fromSecretKey(privateKeyBytes);

console.log("Wallet Public Key:", wallet.publicKey.toString());

interface getCurrentDetailsResponse {
    type: string;
    icon: string;
    title: string;
    label: string;
    description: string;
}

interface getPredictionResponse {
    transaction: string; // This is the encoded transaction
    message: string;
    links: {
        next: {
            type: string;
            href: string;
        }
    }
}

interface getCurrentColorPositions {
    red: number;
    blue: number;
    yellow: number;
    green: number;
}

interface getExtractGameData {
    colors: getCurrentColorPositions;
    colorName: string;
}

interface getMovePrediction {
    gameData: getExtractGameData;
    rolledNumber: number;
    predictionResponse: getPredictionResponse;
}

interface GameResult {
    isWinningMove: boolean;
    currentPosition: number;
    newPosition: number;
    rolledNumber: number;
    colorName: string;
    transactionDetails: {
        encodedTransaction: string;
        nextActionLink?: string;
    };
    gameState: {
        colors: getCurrentColorPositions;
        currentDetails: getCurrentDetailsResponse;
    };
}

function extractGameData(data: getCurrentDetailsResponse): getExtractGameData {
    const iconParts = data.icon.split("_")[1].split("-");

    const colors: getCurrentColorPositions = {
        red: parseInt(iconParts[0], 10),
        blue: parseInt(iconParts[1], 10),
        yellow: parseInt(iconParts[2], 10),
        green: parseInt(iconParts[3], 10),
    };

    const descriptionParts = data.description.trim().split(" ");
    const colorName = descriptionParts[2].toLowerCase();

    return {
        colors,
        colorName,
    };
}

function extractRolledNumber(data: getPredictionResponse): number | null {
    const regex = /rolled a (\d+)/;
    const match = data.message.match(regex);

    return match ? parseInt(match[1], 10) : null;
}

async function getCurrentDetails(retryCount = 0): Promise<getCurrentDetailsResponse> {
    try {
        const response = await axios.get("https://snakes.sendarcade.fun/api/actions/game");
        return response.data as getCurrentDetailsResponse;
    } catch (error) {
        if (retryCount < MAX_RETRIES) {
            console.log(`Retrying getCurrentDetails... (${retryCount + 1}/${MAX_RETRIES})`);
            await sleep(RETRY_DELAY);
            return getCurrentDetails(retryCount + 1);
        }
        console.error("Error fetching current details:", error);
        throw error;
    }
}

async function getPrediction(retryCount = 0): Promise<getPredictionResponse> {
    try {
        const response = await axios.post("https://snakes.sendarcade.fun/api/actions/game", {
            account: wallet.publicKey.toString()
        });
        return response.data as getPredictionResponse;
    } catch (error) {
        if (retryCount < MAX_RETRIES) {
            console.log(`Retrying getPrediction... (${retryCount + 1}/${MAX_RETRIES})`);
            await sleep(RETRY_DELAY);
            return getPrediction(retryCount + 1);
        }
        console.error("Error fetching prediction:", error);
        throw error;
    }
}

async function makeMovePrediction(): Promise<getMovePrediction> {
    try {
        const currentDetails = await getCurrentDetails();
        const gameData = extractGameData(currentDetails);

        const predictionResponse = await getPrediction();
        const rolledNumber = extractRolledNumber(predictionResponse);

        if (rolledNumber === null) {
            throw new Error("No rolled number found");
        }

        return {
            gameData,
            rolledNumber,
            predictionResponse
        };
    }
    catch (error) {
        console.error("Error making move prediction:", error);
        throw error;
    }
}

function analyzeGameMove(data: getMovePrediction): GameResult {
    const { gameData, rolledNumber, predictionResponse } = data;
    const { colors, colorName } = gameData;

    const currentPosition = colors[colorName as keyof getCurrentColorPositions];
    const newPosition = currentPosition + rolledNumber;
    const isWinningMove = winnerArrayNumber.includes(newPosition);

    return {
        isWinningMove,
        currentPosition,
        newPosition,
        rolledNumber,
        colorName,
        transactionDetails: {
            encodedTransaction: predictionResponse.transaction,
            nextActionLink: predictionResponse.links?.next?.href
        },
        gameState: {
            colors,
            currentDetails: {} as getCurrentDetailsResponse
        }
    };
}

async function processEncodedTransaction(encodedTransaction: string): Promise<string> {
    try {
        console.log("Processing encoded transaction...");

        const decodedTransaction = bs58.decode(encodedTransaction);

        let transaction: Transaction | VersionedTransaction;

        try {
            transaction = VersionedTransaction.deserialize(decodedTransaction);
        } catch (e) {
            transaction = Transaction.from(decodedTransaction);
        }

        if (transaction instanceof Transaction) {
            transaction.sign(wallet);
        }

        const signature = await connection.sendRawTransaction(
            transaction.serialize(),
            {
                skipPreflight: false,
                preflightCommitment: "confirmed",
                maxRetries: 3,
            }
        );

        await connection.confirmTransaction(signature, "confirmed");

        console.log("Transaction confirmed:", signature);
        return signature;

    } catch (error) {
        console.error("Error processing encoded transaction:", error);
        throw error;
    }
}

async function executeGameMove(gameResult: GameResult) {
    try {
        if (gameResult.isWinningMove) {
            console.log("\n🎉 WINNING MOVE DETECTED! 🎉");
            console.log("Processing transaction...");

            const signature = await processEncodedTransaction(
                gameResult.transactionDetails.encodedTransaction
            );

            console.log("\nTransaction Details:");
            console.log("=====================");
            console.log(`Solana Transaction Signature: ${signature}`);
            console.log(`Encoded Transaction: ${gameResult.transactionDetails.encodedTransaction}`);
        }
    } catch (error) {
        console.error("Error executing game move:", error);
        throw error;
    }
}

async function gameLoop() {
    console.log("Starting game loop...");

    while (true) {
        try {
            console.log("\nAnalyzing next move...");

            const moveData = await makeMovePrediction();
            const currentDetails = await getCurrentDetails();

            const gameResult = analyzeGameMove(moveData);
            gameResult.gameState.currentDetails = currentDetails;

            console.log("\nMove Analysis:");
            console.log(`Color: ${gameResult.colorName}`);
            console.log(`Current Position: ${gameResult.currentPosition}`);
            console.log(`Rolled Number: ${gameResult.rolledNumber}`);
            console.log(`New Position: ${gameResult.newPosition}`);

            if (gameResult.isWinningMove) {
                await executeGameMove(gameResult);
                console.log("Winning move executed successfully!");
            }

            console.log(`\nWaiting ${POLLING_INTERVAL / 1000} seconds before next check...`);
            await sleep(POLLING_INTERVAL);

        } catch (error) {
            console.error("Error in game loop:", error);
            console.log("Retrying in 10 seconds...");
            await sleep(10000);
        }
    }
}

console.log("Initializing game bot...");
gameLoop()
    .catch(error => {
        console.error("Fatal error in game loop:", error);
        process.exit(1);
    });