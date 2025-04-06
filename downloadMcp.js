// import axios from "axios";
const axios = require("axios")

async function downloadMcp() {
  const mcpId = "github.com/executeautomation/mcp-playwright";

  try {
    const response = await axios.post(
      "https://api.cline.bot/v1/mcp/download",
      { mcpId },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    console.log("ダウンロード成功:", response.data);
  } catch (error) {
    if (error.response) {
      console.error("APIエラー:", error.response.data);
    } else if (error.request) {
      console.error("リクエスト送信失敗:", error.request);
    } else {
      console.error("エラー:", error.message);
    }
  }
}

downloadMcp();
