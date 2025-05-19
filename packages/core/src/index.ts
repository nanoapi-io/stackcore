import { initKyselyDb } from "./db/database.ts";
import api from "./api/index.ts";

initKyselyDb();

const port = 3000;
api.listen({ port });
console.info(`Server is running on port http://localhost:${port}`);
