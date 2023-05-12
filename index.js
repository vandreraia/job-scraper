import { chromium } from 'playwright';
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage, NewMessageEvent } from 'telegram/events/index.js';
import input from "input";
import * as dotenv from 'dotenv';
import nodemailer from "nodemailer";

dotenv.config()

const stringSession = new StringSession(process.env.STRING_SESSION); // fill this later with the value from session.save()
const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;

(async () => {
    const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 50,
    });
    await client.start({
        phoneNumber: async () => await input.text("Please enter your number: "),
        password: async () => await input.text("Please enter your password: "),
        phoneCode: async () =>
            await input.text("Please enter the code you received: "),
        onError: (err) => console.log(err),
    });
    console.log("You should now be connected.");
    // console.log(client.session.save()); // Save this string to avoid logging in again

    await client.sendMessage("me", { message: "----------------------------------------------" });

    for await (const message of client.iterMessages("-1001602637524", { search: "react", limit: 1 })) {
        let text = message.text.toLowerCase();
        let title = message.media?.webpage?.title;

        console.log(message.text)

        if (!text.includes("estágio") && !text.includes("estagiário")) {
            if (title) {
                if (!title.toLowerCase().includes("estágio")) {
                    await client.sendMessage("me", { message });
                }
            }
        }
    }

    async function getId(event) {
        console.log(event.message.media.webpage)
    }
    async function scrape(event) {
        const message = event.message;
        const text = message.text.toLowerCase();
        const title = message.media?.webpage?.title;

        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        const HTML = message.media?.webpage?.url;

        // var expression = /(https?:\/\/(?:www\.|(?!www))[^\s\.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})/gi;
        var urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
        var matches = message.message.match(urlRegex);

        matches?.map(async (match) => {
            await page.goto(match);
            if (match.includes("gupy")) {
                await findSkills('[class*=sc-cbe8a5b4-2]');
            } else if (match.includes("linkedin")) {
                await findSkills('[class*=break-words]');
            } else {
                const content = await page.content();
                if (content.toLowerCase().includes('react') || content.toLowerCase().includes('node')) {
                    console.log(content)
                    // sendMail(content);
                    await client.sendMessage("me", { message });
                }
            }
            await page.close();
            await browser.close();

            async function findSkills(locator) {
                const texts = await page.locator(locator).allTextContents();
                texts.map(async (text) => {
                    if (text.toLowerCase().includes('react') || text.toLowerCase().includes('node')) {
                        console.log(text)
                        // sendMail(text);
                        await client.sendMessage("me", { message });
                    }
                })
            }
        })
        // if (!text.includes("estágio") && !text.includes("estagiário")) {
        //     console.log(text)
        //     if (title) {
        //         if (!title.toLowerCase().includes("estágio") && !text.includes("estagiário")) {
        //             await client.sendMessage("me", { message });
        //             break;
        //         }
        //     } else {
        //         await client.sendMessage("me", { message });
        //     }
        // }
    }

    client.addEventHandler(scrape, new NewMessage({ chats: ["-1001602637524"] }));
    client.addEventHandler(scrape, new NewMessage());
})();


function sendMail(text) {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.MAIL,
            pass: process.env.MAIL_PASSWORD
        }
    });

    var mailOptions = {
        from: process.env.MAIL,
        to: process.env.MAIL,
        subject: 'Sending Email using Node.js',
        text
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}