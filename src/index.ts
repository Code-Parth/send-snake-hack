import axios from "axios";

const winnerArrayNumber = [4, 14, 18, 24, 34, 42, 44, 48, 49];

interface getCurrentDetailsResponse {
    type: string;
    icon: string;
    title: string;
    label: string;
    description: string;
}

interface getPredictionResponse {
    transaction: string;
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

interface Result {
    colors: getCurrentColorPositions;
    colorName: string;
};

function extractGameData(data: getCurrentDetailsResponse): Result {
    const iconParts = data.icon.split('_')[1].split('-');

    const colors: getCurrentColorPositions = {
        red: parseInt(iconParts[0], 10),
        blue: parseInt(iconParts[1], 10),
        yellow: parseInt(iconParts[2], 10),
        green: parseInt(iconParts[3], 10),
    };

    const descriptionParts = data.description.trim().split(' ');
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

async function getCurrentDetails() {
    console.log("Fetching getCurrentDetails...");
    try {
        const response = await axios.get("https://snakes.sendarcade.fun/api/actions/game");
        return response.data as getCurrentDetailsResponse;
    } catch (error) {
        console.error("Error fetching data:", error);
        throw error;
    }
}

async function getPridiction() {
    console.log("Fetching getPrediction...");
    try {
        const response = await axios.post("https://snakes.sendarcade.fun/api/actions/game", {
            account: "E7twE5fiDxxsoepLFpsxkqyRfjzhoY8YEGhoT9zWrJmE"
        });
        return response.data as getPredictionResponse;
    } catch (error) {
        console.error("Error fetching data:", error);
        throw error;
    }
}

async function makeMovePrediction() {
    console.log("Making move prediction...");
    try {
        const currentDetails = await getCurrentDetails();
        const gameData = extractGameData(currentDetails);

        const prediction = await getPridiction();
        const rolledNumber = extractRolledNumber(prediction);

        if (rolledNumber === null) {
            console.error("No rolled number found");
            throw new Error("No rolled number found");
        }

        console.log("Game Data:", gameData);
        console.log("Rolled Number:", rolledNumber);

        return { gameData, rolledNumber };
    }
    catch (error) {
        console.error("Error making move:", error);
        throw error;
    }
}

async function main() {
    try {
        const data = await makeMovePrediction();
        console.log("Data:", data);
    } catch (error) {
        console.error("Error in main:", error);
        throw error;
    }
}

main();