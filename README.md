# actual-comdirect
Automatically extract transactions from a comdirect CSV and add them to the correct accounts in actual budget.

## Installation
1. Download the `docker-compose.example.yml` and re-name it to `docker-compose.yml`.
2. Download the `.env.example` and re-name it to `.env`.
3. Edit the `.env` and add your actual instance details.
4. Use `docker-compose up -d` to start

## Usage
Open `http://<server>:5007` in your browser. Export a CSV of your transactions from comdirect. Upload the CSV and click Import. The script will automatically extract the transactions and add them to the correct accounts in actual.