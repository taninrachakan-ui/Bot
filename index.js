// เพิ่มส่วนนี้บนสุดของไฟล์ index.js
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Bot is running!');
});

app.listen(3000, () => {
  console.log('Server is ready!');
});
// จบส่วนที่เพิ่ม

/**
 * ──────────────────────────────────────────
 * DISCORD SHOP BOT (Termux Friendly)
 * Author: Gemini (AI Assistant)
 * Version: 1.0.0
 * Note: แก้ไขส่วน CONFIG ด้านล่างก่อนรัน
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

// ──────────────────────────────────────────
// ⚙️ CONFIG (ตั้งค่าส่วนนี้)
// ──────────────────────────────────────────

const TOKEN = 'MTQ2OTUzOTExNzgyMDk0MDM3Mg.GQnbZp.hMWt6XFXo9QUAbfenCvDr24mPGeCaarLGIQO14';
const ADMIN_ROLE_ID = '1469541603327738082';
const DATA_FILE = 'customer_data.json'; // ชื่อไฟล์เก็บข้อมูลลูกค้า

// ──────────────────────────────────────────
// 🔧 SYSTEM & DATA (ระบบจัดการข้อมูล)
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

// โหลดข้อมูลลูกค้า (ถ้ามีไฟล์) หรือสร้างใหม่
let customerData = {};
if (fs.existsSync(DATA_FILE)) {
    customerData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

// ฟังก์ชันบันทึกข้อมูล
function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(customerData, null, 2));
}

// ฟังก์ชันดึงสถานะลูกค้า
function getCustomerStatus(userId) {
    const count = customerData[userId] || 0;
    const isRegular = count > 7;
    return {
        count: count,
        label: isRegular ? "⭐ ลูกค้าประจำ" : "👤 ลูกค้าทั่วไป",
        isRegular: isRegular
    };
}

// ──────────────────────────────────────────
// 🚀 BOT EVENTS
// ──────────────────────────────────────────

client.once('ready', () => {
    console.log(`✅ บอทออนไลน์แล้ว: ${client.user.tag}`);
    console.log(`🤖 พร้อมทำงานบน Termux!`);
});

// คำสั่งสร้างปุ่มหน้าห้อง (!setup)
client.on('messageCreate', async (message) => {
    if (message.content === '!setup') {
        // ลบข้อความคำสั่งเพื่อความสะอาด
        message.delete().catch(() => {});

        const embed = new EmbedBuilder()
            .setTitle('🛒 สั่งงานร้านค้า (Shop Order)')
            .setDescription('กดปุ่มด้านล่างเพื่อกรอกแบบฟอร์มสั่งงาน\n\n📌 **บริการที่มี:**\n- ทำดิสคอร์ด\n- ทำแมพ\n- อื่นๆ')
            .setColor('#0099ff');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_open_form')
                .setLabel('📝 สั่งงานคลิกเลย')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📦')
        );

        await message.channel.send({ embeds: [embed], components: [row] });
    }
});

// ──────────────────────────────────────────
// 🎮 INTERACTION HANDLER (จัดการปุ่ม/ฟอร์ม)
// ──────────────────────────────────────────

client.on('interactionCreate', async (interaction) => {
    
    // 1. กดปุ่มเปิดฟอร์ม
    if (interaction.isButton() && interaction.customId === 'btn_open_form') {
        const modal = new ModalBuilder()
            .setCustomId('modal_order_submit')
            .setTitle('แบบฟอร์มสั่งงาน');

        const nameInput = new TextInputBuilder()
            .setCustomId('input_name')
            .setLabel("ชื่อเล่น / Discord ID")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const typeInput = new TextInputBuilder()
            .setCustomId('input_type')
            .setLabel("ประเภทงาน (ดิส, แมพ, ฯลฯ)")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const detailInput = new TextInputBuilder()
            .setCustomId('input_detail')
            .setLabel("รายละเอียดงาน")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const budgetInput = new TextInputBuilder()
            .setCustomId('input_budget')
            .setLabel("งบประมาณ")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(typeInput),
            new ActionRowBuilder().addComponents(detailInput),
            new ActionRowBuilder().addComponents(budgetInput)
        );

        await interaction.showModal(modal);
    }

    // 2. เมื่อส่งฟอร์ม (Modal Submit)
    if (interaction.isModalSubmit() && interaction.customId === 'modal_order_submit') {
        const name = interaction.fields.getTextInputValue('input_name');
        const type = interaction.fields.getTextInputValue('input_type');
        const detail = interaction.fields.getTextInputValue('input_detail');
        const budget = interaction.fields.getTextInputValue('input_budget');

        // ดึงสถานะลูกค้าปัจจุบัน
        const status = getCustomerStatus(interaction.user.id);

        const embed = new EmbedBuilder()
            .setTitle('📦 ORDER (รอการยืนยัน)')
            .setColor('#FFD700') // สีทอง = รอ
            .addFields(
                { name: '👤 ลูกค้า', value: `${interaction.user} (${name})`, inline: true },
                { name: '🔖 สถานะลูกค้า', value: `${status.label} (สั่งแล้ว ${status.count} ครั้ง)`, inline: true },
                { name: '🛠️ ประเภท', value: type, inline: true },
                { name: '💰 งบประมาณ', value: budget, inline: true },
                { name: '📝 รายละเอียด', value: detail }
            )
            .setFooter({ text: 'กด "ยืนยันออเดอร์" เพื่อเปิดห้อง Ticket' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_confirm_order').setLabel('✅ ยืนยันออเดอร์').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('btn_cancel_order').setLabel('❌ ยกเลิก').setStyle(ButtonStyle.Danger)
        );

        // ตอบกลับแบบ Ephemeral (เห็นคนเดียว) หรือ Public ก็ได้ (ในที่นี้ทำเป็น Ephemeral เพื่อกันรก)
        // **แต่** โจทย์ต้องการให้มีปุ่มยืนยัน ดังนั้นส่งให้ user เห็นคนเดียวก่อนดีที่สุด
        await interaction.reply({ 
            content: 'กรุณาตรวจสอบข้อมูลและกดยืนยัน', 
            embeds: [embed], 
            components: [row],
            ephemeral: true 
        });
    }

    // 3. กดปุ่มยืนยันออเดอร์ (สร้าง Ticket)
    if (interaction.isButton() && interaction.customId === 'btn_confirm_order') {
        
        // ดึงข้อมูลจาก Embed เดิม
        const oldEmbed = interaction.message.embeds[0];
        
        // สร้างห้อง Ticket
        const ticketChannel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: interaction.guild.id, // Everyone
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: interaction.user.id, // ลูกค้า
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
                {
                    id: ADMIN_ROLE_ID, // แอดมิน
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
            ],
        });

        // สร้าง Embed ใหม่ในห้อง Ticket
        const ticketEmbed = EmbedBuilder.from(oldEmbed)
            .setTitle('🎫 TICKET OPENED')
            .setColor('#00FF00')
            .setFooter({ text: 'สถานะ: ⏳ กำลังรอแอดมินรับงาน' });

        // ปุ่มควบคุม (แอดมิน + ลูกค้า)
        const adminRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('admin_working').setLabel('🔵 กำลังทำ').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('admin_done').setLabel('🟢 ส่งงานเสร็จสิ้น').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('admin_close').setLabel('🔴 ปิดงาน/ยกเลิก').setStyle(ButtonStyle.Danger)
        );

        const userRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('user_cancel').setLabel('❌ ยกเลิกงาน (ลูกค้า)').setStyle(ButtonStyle.Secondary)
        );

        // ส่งข้อความเข้าห้อง Ticket
        await ticketChannel.send({
            content: `สวัสดีครับ ${interaction.user} และ <@&${ADMIN_ROLE_ID}>`,
            embeds: [ticketEmbed],
            components: [adminRow, userRow]
        });

        // อัปเดตข้อความเดิมว่าเปิดห้องแล้ว
        await interaction.update({ content: `✅ เปิดห้อง Ticket แล้วที่: ${ticketChannel}`, components: [], embeds: [] });
    }

    // 4. ปุ่มยกเลิก (ตอนหน้าฟอร์ม)
    if (interaction.isButton() && interaction.customId === 'btn_cancel_order') {
        await interaction.update({ content: '❌ ยกเลิกรายการแล้ว', components: [], embeds: [] });
    }

    // ──────────────────────────────────────────
    // 👮 ADMIN CONTROL ZONE
    // ──────────────────────────────────────────

    const adminButtons = ['admin_working', 'admin_done', 'admin_close'];
    
    if (interaction.isButton() && adminButtons.includes(interaction.customId)) {
        
        // เช็คสิทธิ์แอดมิน
        if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
            return interaction.reply({ content: '⛔ คุณไม่มีสิทธิ์ใช้ปุ่มนี้ (สำหรับแอดมิน)', ephemeral: true });
        }

        const currentEmbed = interaction.message.embeds[0];
        let newEmbed = EmbedBuilder.from(currentEmbed);

        // ปุ่ม: กำลังทำ
        if (interaction.customId === 'admin_working') {
            newEmbed.setColor('#0099ff').setFooter({ text: 'สถานะ: 🔵 แอดมินกำลังดำเนินงาน...' });
            await interaction.update({ embeds: [newEmbed] });
        }

        // ปุ่ม: ปิดงาน (ไม่นับแต้ม)
        if (interaction.customId === 'admin_close') {
            await interaction.reply('🔴 กำลังปิดห้องใน 5 วินาที...');
            setTimeout(() => interaction.channel.delete(), 5000);
        }

        // ปุ่ม: ส่งงานเสร็จสิ้น (นับแต้ม +1)
        if (interaction.customId === 'admin_done') {
            // ดึง ID ลูกค้าจาก Permission ของห้อง (วิธีที่ง่ายกว่าคือดึงจากเนื้อหา หรือเก็บ state แต่เพื่อความง่ายใช้การ parse text หรือ logic permission)
            // แต่ในที่นี้เราจะดึงจาก interaction.message.content ที่เราแท็กไว้ตอนแรก หรือ Description
            // เพื่อความชัวร์ เราจะดึงจาก topic หรือ permission แต่บอทนี้ง่ายๆ เราจะใช้ channel name หรือ history
            // *วิธีที่เสถียรสุดใน single file*: ค้นหา User ในห้องนี้ที่ไม่ใช่บอทและไม่ใช่แอดมิน (หรือคนที่เปิดตั๋ว)
            // *Simpler Fix*: ใน Embed เรามี field "ลูกค้า" อยู่

            // หาลูกค้าเพื่อเพิ่มแต้ม
            // เราจะใช้การ match user id จาก field value หรือ interaction เดิม (ยากถ้าไม่อยู่ใน mem)
            // ดังนั้น เราจะ scan หา User ที่โดน mention ใน message content
            const mentionedUser = interaction.message.mentions.users.first(); 
            // หมายเหตุ: user ที่กดปุ่มคือแอดมิน, user ที่ถูกแท็กใน content คือลูกค้า

            if (mentionedUser) {
                // เพิ่มแต้ม
                if (!customerData[mentionedUser.id]) customerData[mentionedUser.id] = 0;
                customerData[mentionedUser.id] += 1;
                saveData(); // บันทึกไฟล์

                const newStatus = getCustomerStatus(mentionedUser.id);
                
                newEmbed.setColor('#2ecc71')
                    .setTitle('✅ งานเสร็จสิ้น (COMPLETED)')
                    .setFooter({ text: 'สถานะ: 🟢 ส่งงานเรียบร้อย' });
                
                // อัปเดตข้อมูลลูกค้าใน Embed
                // (ต้องสร้าง fields ใหม่ เพราะแก้เฉพาะอันเดิมยาก)
                // เพื่อความง่าย เราจะต่อท้าย Description แทน
                const congratsMsg = newStatus.isRegular ? `\n\n🎉 **ยินดีด้วย! ตอนนี้คุณคือ ${newStatus.label}**` : '';

                await interaction.update({ 
                    content: `🎉 ส่งงานเรียบร้อย! ขอบคุณครับ ${mentionedUser}\n📊 สั่งงานสำเร็จครั้งที่: **${newStatus.count}**${congratsMsg}`,
                    embeds: [newEmbed], 
                    components: [] // ลบปุ่มออก
                });

            } else {
                 await interaction.update({ content: '⚠️ ไม่พบข้อมูลลูกค้า (Error)', components: [] });
            }
        }
    }

    // 5. ปุ่มลูกค้ายกเลิกงาน (ใน Ticket)
    if (interaction.isButton() && interaction.customId === 'user_cancel') {
        await interaction.reply('❌ ลูกค้าขอยกเลิกงาน.. กำลังปิดห้อง');
        setTimeout(() => interaction.channel.delete(), 5000);
    }

});

// Login
client.login(TOKEN);
