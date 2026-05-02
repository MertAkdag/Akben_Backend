import "dotenv/config";
import app from "./app";
import { getEnv } from "./config/env";

const { PORT } = getEnv();

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
