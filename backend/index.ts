import app, { PORT } from "./src/app";
import { connectToMongoDB } from "./src/database/mongodb";

connectToMongoDB();

app.listen(PORT, () => {
    console.log(`Server: http://localhost:${PORT}`);
});
