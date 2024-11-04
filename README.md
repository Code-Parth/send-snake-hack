# Send Snake Hack

This project is a bot that interacts with the Send Snake game, making predictions and executing game moves based on the game's current state.

## Setup

1. **Clone the repository:**

    ```sh
    git clone "https://github.com/Code-Parth/send-snake-hack.git"
    cd send-snake-hack
    ```

2. **Install dependencies:**

    ```sh
    yarn
    ```

3. **Set up the private key:**

    - Copy `PRIVATE_KEY.example` to `PRIVATE_KEY`.
    - Replace the content of `PRIVATE_KEY` with your actual private key.


## Usage

```sh
yarn dev
```

## Configuration

The project uses the following configuration options:

- **POLLING_INTERVAL**: Interval between each game move check (default: 5000 ms).
- **MAX_RETRIES**: Maximum number of retries for API calls (default: 3).
- **RETRY_DELAY**: Delay between retries (default: 1000 ms).
- **SOLANA_RPC_URL**: URL for the Solana RPC endpoint (default: "https://api.mainnet-beta.solana.com").

## License

This project is licensed under the MIT License.
