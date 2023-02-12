import * as dotenv from "dotenv";
dotenv.config();
import { parse } from "yaml";
import fs from "fs";

let configFile: any = {};
if (fs.existsSync("./config.yaml")) {
  const file = fs.readFileSync("./config.yaml", "utf8");
  configFile = parse(file);
} else {
  configFile = {
    email: process.env.CHAT_GPT_EMAIL,
    password: process.env.CHAT_GPT_PASSWORD,
    openai_api_key: process.env.OPENAI_API_KEY,
    model: process.env.model,
    chat_private_tigger_keyword: process.env.CHAT_PRIVATE_TRIGGER_KEYWORD,
    openai_proxy: process.env.OPENAI_PROXY,
  };
}
dotenv.config();

export const config = {
  openai_api_key: configFile.openai_api_key,
  email: configFile.email,
  password: configFile.password,
  model: configFile.model,
  chat_private_tigger_keyword: configFile.chat_private_tigger_keyword,
  openai_proxy: configFile.openai_proxy
};
