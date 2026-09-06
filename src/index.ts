import app from "./app";

const PORT = process.env.PORT || 7000;

app.listen(PORT, () => {
  console.log(`🚀 Server running at: http://0.0.0.0:${PORT}`);
});
