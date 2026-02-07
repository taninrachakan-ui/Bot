/**
 * ──────────────────────────────────────────
 * DISCORD SHOP BOT (Render Ready)
 * Version: 2.1 (Fixed Permissions)
 * ──────────────────────────────────────────
 */

const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    PermissionsBitField, 
    ChannelType 
} = require('discord.js');
const fs = require('fs');
const express = require('express');

// ──────────────────────────────────────────
// ⚙️ ส่วนตั้งค่า (แก้ไขตรงนี้)
// ──────────────────────────────────────────

// ⚠️ ใส่ Token ของจริงตรงนี้ (ในเครื่องหมาย ' ')
const TOKEN = 'MTQ2OTUzOTExNzgyMDk0MDM3Mg.GqmS1A.7QCCFGdxuCRxd40swdkpzkruYfHeSMzehAmhDY'; 

// ⚠️ ใส่ ID Role แอดมิน (เอาไว้กดปุ่มรับงาน/ปิดงาน)
const ADMIN_ROLE_ID = '1469541603327738082'; 

const DATA_FILE = 'customer_data.json';

// ──────────────────────────────────────────
// 🌐 ส่วน Web Server (เพื่อให้ Render ไม่หลับ)
// ──────────────────────────────────────────

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('✅ Bot is running online 24/7!');
});

app.listen(port, () => {
    console.log(`🌐 Server is ready on port ${port}`);
});

// ──────────────────────────────────────────
// 🤖 ส่วนระบบบอท
// ──────────────────────────────────────────

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
    ],
    partials: [Partials.Channel]
});

// โหลดข้อมูลลูกค้า
let customerData = {};
if (fs.existsSync(DATA_FILE)) {
    try {
        customerData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    } catch (e) {
        console.error("Error reading data file:", e);
        customerData = {};
    }
}

function saveData() {
    // หมายเหตุ: บน Render ฟรี ไฟล์นี้จะถูกรีเซ็ตทุกครั้งที่บอทเริ่มใหม่
    fs.writeFileSync(DATA_FILE, JSON.stringify(customerData, null, 2));
}

function getCustomerStatus(userId) {
    const count = customerData[userId] || 0;
    const isRegular = count > 7;
    return {
        count: count,
        label: isRegular ? "⭐ ลูกค้าประจำ" : "👤 ลูกค้าทั่วไป",
        isRegular: isRegular
    };
}

client.once('ready', () => {
    console.log(`✅ บอทออนไลน์ในชื่อ: ${client.user.tag}`);
});

// คำสั่ง !setup
client.on('messageCreate', async (message) => {
    if (message.content === '!setup') {
        // ลบข้อความคำสั่ง (ถ้าบอทมีสิทธิ์)
        if (message.deletable) await message.delete().catch(() => {});

        const embed = new EmbedBuilder()
            .setTitle('🛒 สั่งงานร้านค้า (Shop Order)')
            .setDescription('กดปุ่มด้านล่างเพื่อเปิดบิลสั่งงาน\n\n📌 **บริการของเรา:**\n- รับทำ Discord\n- รับทำ Map\n- งานออกแบบอื่นๆ')
            .setColor('#5865F2')
            .setFooter({ text: 'ระบบอัตโนมัติ 24 ชม.' });
            // .setImage('...') // ใส่รูปลิงก์ตรงนี้ถ้ามี

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_open_form')
                .setLabel('📝 เปิดบิลสั่งงาน')
                .setStyle(ButtonStyle.Success)
                .setEmoji('📦')
        );

        await message.channel.send({ embeds: [embed], components: [row] });
    }
});

// จัดการ Interaction
client.on('interactionCreate', async (interaction) => {
    
    // 1. กดปุ่มเปิดฟอร์ม
    if (interaction.isButton() && interaction.customId === 'btn_open_form') {
        const modal = new ModalBuilder()
            .setCustomId('modal_order_submit')
            .setTitle('แบบฟอร์มสั่งงาน');

        const nameInput = new TextInputBuilder()
            .setCustomId('input_name').setLabel("ชื่อเล่น").setStyle(TextInputStyle.Short).setRequired(true);
        const typeInput = new TextInputBuilder()
            .setCustomId('input_type').setLabel("ประเภทงาน").setStyle(TextInputStyle.Short).setRequired(true);
        const detailInput = new TextInputBuilder()
            .setCustomId('input_detail').setLabel("รายละเอียดงาน").setStyle(TextInputStyle.Paragraph).setRequired(true);
        const budgetInput = new TextInputBuilder()
            .setCustomId('input_budget').setLabel("งบประมาณ").setStyle(TextInputStyle.Short).setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(typeInput),
            new ActionRowBuilder().addComponents(detailInput),
            new ActionRowBuilder().addComponents(budgetInput)
        );

        await interaction.showModal(modal);
    }

    // 2. ส่งฟอร์มเสร็จแล้ว (Preview ก่อนสร้างห้อง)
    if (interaction.isModalSubmit() && interaction.customId === 'modal_order_submit') {
        const name = interaction.fields.getTextInputValue('input_name');
        const type = interaction.fields.getTextInputValue('input_type');
        const detail = interaction.fields.getTextInputValue('input_detail');
        const budget = interaction.fields.getTextInputValue('input_budget');
        const status = getCustomerStatus(interaction.user.id);

        const embed = new EmbedBuilder()
            .setTitle('🧾 สรุปรายการสั่งซื้อ')
            .setColor('#FFD700')
            .addFields(
                { name: '👤 ลูกค้า', value: `${interaction.user} (${name})`, inline: true },
                { name: '🏷️ สถานะ', value: status.label, inline: true },
                { name: '🛠️ ประเภทงาน', value: type, inline: true },
                { name: '💰 งบประมาณ', value: budget, inline: true },
                { name: '📝 รายละเอียด', value: detail }
            )
            .setFooter({ text: 'กรุณากด "ยืนยัน" เพื่อส่งเรื่องถึงแอดมิน' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_confirm_order').setLabel('✅ ยืนยันสร้างห้อง').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('btn_cancel_order').setLabel('❌ ยกเลิก').setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({ 
            content: 'ตรวจสอบข้อมูลก่อนยืนยันนะครับ', 
            embeds: [embed], 
            components: [row],
            ephemeral: true 
        });
    }

    // 3. กดยืนยัน (สร้างห้อง Ticket)
    if (interaction.isButton() && interaction.customId === 'btn_confirm_order') {
        const oldEmbed = interaction.message.embeds[0];
        
        try {
            // สร้างห้อง
            const ticketChannel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { 
                        id: interaction.guild.id, 
                        deny: [PermissionsBitField.Flags.ViewChannel] // ปิดไม่ให้คนอื่นเห็น
                    },
                    { 
                        id: interaction.user.id, 
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] // ลูกค้าเห็น
                    },
                    { 
                        id: ADMIN_ROLE_ID, 
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] // แอดมินเห็น
                    },
                    {
                        id: client.user.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] // ✅ บอทต้องเห็น (สำคัญมาก!)
                    }
                ],
            });

            const ticketEmbed = EmbedBuilder.from(oldEmbed)
                .setTitle('🎫 TICKET OPENED')
                .setColor('#00FF00')
                .setDescription(`สวัสดีครับ ${interaction.user} แอดมินจะรีบตอบกลับนะครับ`)
                .setFooter({ text: 'สถานะ: รอแอดมินรับงาน...' });

            const adminRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('admin_working').setLabel('🔵 กำลังทำ').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('admin_done').setLabel('🟢 ส่งงานเสร็จ').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('admin_close').setLabel('🔴 ปิดห้อง').setStyle(ButtonStyle.Danger)
            );

            await ticketChannel.send({
                content: `📢 New Order! ${interaction.user} | <@&${ADMIN_ROLE_ID}>`,
                embeds: [ticketEmbed],
                components: [adminRow]
            });

            await interaction.update({ content: `✅ สร้างห้องแล้วที่ ${ticketChannel}`, components: [], embeds: [] });

        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '❌ สร้างห้องไม่สำเร็จ! (โปรดเช็คว่าบอทมียศสูงพอ หรือ ID Role ถูกต้อง)', ephemeral: true });
        }
    }

    // 4. ปุ่มแอดมิน
    const adminActions = ['admin_working', 'admin_done', 'admin_close'];
    if (interaction.isButton() && adminActions.includes(interaction.customId)) {
        
        // เช็คว่าเป็นแอดมินไหม (จาก Role ID)
        if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
            return interaction.reply({ content: '⛔ สำหรับแอดมินเท่านั้น', ephemeral: true });
        }

        const currentEmbed = interaction.message.embeds[0];
        const newEmbed = EmbedBuilder.from(currentEmbed);

        if (interaction.customId === 'admin_working') {
            newEmbed.setColor('#0099ff').setFooter({ text: 'สถานะ: 🔵 กำลังดำเนินการโดย ' + interaction.user.username });
            await interaction.update({ embeds: [newEmbed] });
        }

        if (interaction.customId === 'admin_close') {
            await interaction.reply('🔴 กำลังลบห้องใน 5 วินาที...');
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }

        if (interaction.customId === 'admin_done') {
            const customer = interaction.message.mentions.users.first();

            if (customer) {
                // บวกแต้ม
                if (!customerData[customer.id]) customerData[customer.id] = 0;
                customerData[customer.id] += 1;
                saveData();

                const status = getCustomerStatus(customer.id);
                const congrats = status.isRegular ? `\n🎉 **ยินดีด้วย! คุณเป็น ${status.label} แล้ว**` : '';

                newEmbed.setColor('#2ecc71')
                    .setTitle('✅ งานเสร็จสิ้น (Completed)')
                    .setFooter({ text: 'สถานะ: 🟢 ส่งมอบงานเรียบร้อย' });

                await interaction.update({ 
                    content: `🎉 ส่งงานเรียบร้อย! ขอบคุณที่ใช้บริการครับ ${customer}\n📊 ใช้บริการครั้งที่: **${status.count}** ${congrats}`,
                    embeds: [newEmbed], 
                    components: [] 
                });
            } else {
                // กรณีหาลูกค้าไม่เจอ (อาจจะเพราะข้อความต้นฉบับโดนแก้) ให้ปิดงานไปเลยโดยไม่นับแต้ม
                await interaction.reply({ content: '⚠️ ไม่พบข้อมูลลูกค้า แต่งานเสร็จสิ้นแล้ว', ephemeral: true });
            }
        }
    }
});

client.login(TOKEN);
