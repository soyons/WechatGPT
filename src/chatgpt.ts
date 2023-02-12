import axios from "axios"
import {Queue} from "./conversation"

const ErrorCode2Message: Record<string, string> = {
  "503":
    "OpenAI 服务器繁忙，请稍后再试| The OpenAI server is busy, please try again later",
  "429":
    "OpenAI 服务器限流，请稍后再试| The OpenAI server was limited, please try again later",
  "500":
    "OpenAI 服务器繁忙，请稍后再试| The OpenAI server is busy, please try again later",
  "403":
    "OpenAI 服务器拒绝访问，请稍后再试| The OpenAI server refused to access, please try again later",
  unknown: "未知错误，请看日志 | Error unknown, please see the log",
};

const Commands = ["/reset", "/help", "/set"] as const;
const server_url = "https://api.openai.com/v1/completions"

export const Sleep = (ms:number)=> {
  return new Promise(resolve=>setTimeout(resolve, ms))
}


export class ChatGPT {
  max_tokens: number = 200;
  openai_api_key?: string;
  model: string = "text-davinci-003";
  temperature = 0.1;
  top_p = 1;
  frequency_penalty = 0.0;
  presence_penalty = 0.0;
  stop_ = "[\n]";
  conversation = new Queue();
  talkid?: string;
  max_msg_length = 1000;

  resetConversation() {
    this.conversation.clear();
  }
  
  async command(cmd: typeof Commands[number]): Promise<string> {
    console.log(`command: ${cmd} talkid: ${this.talkid}`);
    if (cmd == "/reset") {
      this.resetConversation();
      return "♻️ 已重置对话 ｜ Conversation reset";
    }
    if (cmd == "/help") {
      return `🧾 支持的命令｜Support command：${Commands.join("，")}`;
    }
    if (cmd.startsWith("/set")) {
      let elements = cmd.split('/');
      switch (elements[1]) {
        case 'max_token_length':
          this.conversation.setMaxTokenLength(Number(elements[2]));
        case 'max_msg_length':
          this.max_msg_length = Number(elements[2]);
      }
      return "Done";
    }
    return "❓ 未知命令｜Unknow Command";
  }

  async getResponse(prompt: string): Promise<any>{
    let res = await axios({
      method: "POST",
      url: server_url,
      headers: {
        'Authorization': `Bearer ${this.openai_api_key}`
      },
      data: {
        prompt: prompt,
        model: this.model,
        temperature: this.temperature,
        max_tokens: this.max_tokens,
        top_p: 1,
        frequency_penalty: this.frequency_penalty,
        presence_penalty: this.presence_penalty,
        stop: this.stop_,
      }
      }).then(response => {
          // console.log(response.data);
          return response.data['choices'][0]['text']
      }, error => {
          console.log('错误', error.message);
          // return 'data: [DONE]';
      })
      return res;
  }

  // send message with talkid
  async getMessage(message: string): Promise<string> {
    if (
      Commands.some((cmd) => {
        return message.startsWith(cmd);
      })
    ) {
      return this.command(message as typeof Commands[number]);
    }
    try {
      // TODO: Add Retry logic
      this.conversation.enqueue(`Q:${message}`);
      let prompt = `${this.conversation.toString()}`;
      console.log(`${this.talkid}\n ${prompt}`);
      let msg = '';
      while (true) {
        prompt = `${this.conversation.toString()}\nA:${msg}`;
        let response = await this.getResponse(prompt);
        if (response == '' || msg.length > this.max_msg_length || typeof response == "undefined") {
          break;
        }
        msg = `${msg}${response}`;
        await Sleep(100);
      };
      if (msg.length > 0) {
        this.conversation.enqueue(`\nA:${msg}`);
        console.log(`A:${msg}`);
        return msg;
      } else  {
        return "无可奉告";
      }
    } catch (err: any) {
      console.error(
        `err is ${err.message}`
      );
      // If send message failed, we will remove the conversation from pool
      this.resetConversation();
      // Retry
      return this.error2msg(err);
    }
  }
  // Make error code to more human readable message.
  error2msg(err: Error): string {
    for (const code in ErrorCode2Message) {
      if (err.message.includes(code)) {
        return ErrorCode2Message[code];
      }
    }
    return ErrorCode2Message.unknown;
  }
}
