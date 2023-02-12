import { ChatGPT } from "./chatgpt";
import { config } from "./config";
import { ContactInterface, RoomInterface } from "wechaty/impls";
import { Message } from "wechaty";
enum MessageType {
  Unknown = 0,

  Attachment = 1, // Attach(6),
  Audio = 2, // Audio(1), Voice(34)
  Contact = 3, // ShareCard(42)
  ChatHistory = 4, // ChatHistory(19)
  Emoticon = 5, // Sticker: Emoticon(15), Emoticon(47)
  Image = 6, // Img(2), Image(3)
  Text = 7, // Text(1)
  Location = 8, // Location(48)
  MiniProgram = 9, // MiniProgram(33)
  GroupNote = 10, // GroupNote(53)
  Transfer = 11, // Transfers(2000)
  RedEnvelope = 12, // RedEnvelopes(2001)
  Recalled = 13, // Recalled(10002)
  Url = 14, // Url(5)
  Video = 15, // Video(4), Video(43)
  Post = 16, // Moment, Channel, Tweet, etc
}

const SINGLE_MESSAGE_MAX_SIZE = 500;
export class ChatGPTBot {
  // Record talkid with conversation id
  chatGPTPool: Map<string, ChatGPT> = new Map();
  chat_private_tigger_keyword = config.chat_private_tigger_keyword;
  botName: string = "";
  ready = true;
  max_tokens: number = 200;
  openai_api_key = config.openai_api_key;
  model = config.model;
  temperature = 0.0;
  top_p = 1;
  frequency_penalty = 0.0;
  presence_penalty = 0.0;
  stop_ = "[\n]";
  setBotName(botName: string) {
    this.botName = botName;
  }
  get chatGroupTiggerKeyword(): string {
    return `@${this.botName}`;
  }
  startGPT(talkerId: string) {
    console.debug(`Start GPT Bot Config is:${JSON.stringify(config)}`);
    const chatgpt = new ChatGPT();
    chatgpt.openai_api_key = this.openai_api_key;
    chatgpt.talkid = talkerId;
    chatgpt.model = this.model;
    this.chatGPTPool.set(talkerId, chatgpt);
    console.debug(`🤖️ Start GPT for ${talkerId} Success, ready to handle message!`);
    this.ready = true;
  }
  // TODO: Add reset conversation id and ping pong
  async command(): Promise<void> {}
  // remove more times conversation and mention
  cleanMessage(rawText: string, privateChat: boolean = false): string {
    let text = rawText;
    const item = rawText.split("- - - - - - - - - - - - - - -");
    if (item.length > 1) {
      text = item[item.length - 1];
    }
    text = text.replace(
      privateChat ? this.chat_private_tigger_keyword : this.chatGroupTiggerKeyword,
      ""
    );
    // remove more text via - - - - - - - - - - - - - - -
    return text;
  }
  async getGPTMessage(text: string, talkerId: string): Promise<string> {
    if (!this.chatGPTPool.has(talkerId)) {
      console.log("add new visitor");
      this.startGPT(talkerId);
    }
    return await this.chatGPTPool.get(talkerId)!.getMessage(text);
  }
  // The message is segmented according to its size
  async trySay(
    talker: RoomInterface | ContactInterface,
    mesasge: string
  ): Promise<void> {
    const messages: Array<string> = [];
    let message = mesasge;
    while (message.length > SINGLE_MESSAGE_MAX_SIZE) {
      messages.push(message.slice(0, SINGLE_MESSAGE_MAX_SIZE));
      message = message.slice(SINGLE_MESSAGE_MAX_SIZE);
    }
    messages.push(message);
    for (const msg of messages) {
      await talker.say(msg);
    }
  }
  // Check whether the ChatGPT processing can be triggered
  tiggerGPTMessage(text: string, privateChat: boolean = false): boolean {
    const chat_private_tigger_keyword = this.chat_private_tigger_keyword;
    let triggered = false;
    if (privateChat) {
      triggered = chat_private_tigger_keyword
        ? text.includes(chat_private_tigger_keyword)
        : true;
    } else {
      triggered = text.includes(this.chatGroupTiggerKeyword);
    }
    if (triggered) {
      console.log(`🎯 Triggered ChatGPT: ${text}`);
    }
    return triggered;
  }
  // Filter out the message that does not need to be processed
  isNonsense(
    talker: ContactInterface,
    messageType: MessageType,
    text: string
  ): boolean {
    return (
      talker.self() ||
      // TODO: add doc support
      messageType !== MessageType.Text ||
      talker.name() == "微信团队" ||
      // 语音(视频)消息
      text.includes("收到一条视频/语音聊天消息，请在手机上查看") ||
      // 红包消息
      text.includes("收到红包，请在手机上查看") ||
      // Transfer message
      text.includes("收到转账，请在手机上查看") ||
      // 位置消息
      text.includes("/cgi-bin/mmwebwx-bin/webwxgetpubliclinkimg")
    );
  }

  async onPrivateMessage(talker: ContactInterface, text: string) {
    const talkerId = talker.id;
    const gptMessage = await this.getGPTMessage(text, talkerId);
    await this.trySay(talker, gptMessage);
  }

  async onGroupMessage(
    talker: ContactInterface,
    text: string,
    room: RoomInterface
  ) {
    const talkerId = room.id + talker.id;
    const gptMessage = await this.getGPTMessage(text, talkerId);
    const result = `${text}\n ------\n ${gptMessage}`;
    await this.trySay(room, result);
  }
  async onMessage(message: Message) {
    const talker = message.talker();
    const rawText = message.text();
    const room = message.room();
    const messageType = message.type();
    const privateChat = !room;
    if (this.isNonsense(talker, messageType, rawText)) {
      return;
    }
    if (this.tiggerGPTMessage(rawText, privateChat)) {
      const text = this.cleanMessage(rawText, privateChat);
      if (privateChat) {
        return await this.onPrivateMessage(talker, text);
      } else {
        return await this.onGroupMessage(talker, text, room);
      }
    } else {
      return;
    }
  }
}
