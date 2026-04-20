import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";

const app = express();
app.use(cors());

app.use(
  cors({ origin: "https://unicodetech-two.vercel.app", credentials: true }),
);

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, true);
    },
    credentials: true,
  }),
);

app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());
app.get("/", (req, res) => {
  res.send("Welcome to the Server API");
});

app.listen(3000, async () => {
  console.log(`Server is running on http://localhost:3000`);
});

export default app;
