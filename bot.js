const { VK } = require('vk-io');
const db = require('./db');
const fs = require('fs');
const pdf = require('pdf-creator-node');
const FormData = require('form-data');

const TOKEN = process.env.VK_TOKEN || 'vk1.a.P5mVdx5lFKmxpJed6bPpDqcRI8MZbaG-n5tt9QNYn3q7BO5lHNZf14huKtAlFEcRgxOQ__G5BKHINuPKeb0s8TYRxIg842OOxFPFZp6lZqMqs6bjUYjUUAzamIMkQcIPx6Pfm-2UncEjruPCPC8L4WPnU2Px5HSBUGiNM2hxMP9ZJ2QJE2ZoXdDFGYAsLsmBr-gKyTHYjAoFspwkkGYdKQ';

const vk = new VK({ token: TOKEN });

const userStates = new Map();


function getMainKeyboard() {
    const keyboard = {
        one_time: false,
        buttons: [
            [
                { action: { type: "text", label: "📝 Новая заявка" }, color: "positive" },
                { action: { type: "text", label: "📋 Мои заявки" }, color: "primary" },
                { action: { type: "text", label: "🗑️ Удалить заявку" }, color: "negative" },
                { action: { type: "text", label: "📊 Статистика" }, color: "primary" }
            ],
            [
                { action: { type: "text", label: "📄 Скачать отчет" }, color: "secondary" },
                { action: { type: "text", label: "❓ FAQ" }, color: "secondary" },
                { action: { type: "text", label: "📞 Контакты" }, color: "secondary" },
                { action: { type: "text", label: "⭐ Оценить работу" }, color: "secondary" }
            ]
        ]
    };
    return JSON.stringify(keyboard);
}

function getCategoryKeyboard() {
    const keyboard = {
        one_time: false,
        buttons: [
            [
                { action: { type: "text", label: "💻 Компьютер/ПО" }, color: "primary" },
                { action: { type: "text", label: "🌐 Интернет/Wi-Fi" }, color: "primary" },
                { action: { type: "text", label: "🔑 Доступы/Пароль" }, color: "primary" },
                { action: { type: "text", label: "🖨️ Принтер/Сканер" }, color: "primary" }
            ],
            [
                { action: { type: "text", label: "📧 Почта/Документы" }, color: "primary" },
                { action: { type: "text", label: "💾 Установка ПО" }, color: "primary" },
                { action: { type: "text", label: "🔧 Оборудование" }, color: "primary" },
                { action: { type: "text", label: "❓ Другое" }, color: "negative" }
            ],
            [
                { action: { type: "text", label: "❌ Отмена" }, color: "secondary" }
            ]
        ]
    };
    return JSON.stringify(keyboard);
}

function getRatingKeyboard() {
    const keyboard = {
        one_time: false,
        buttons: [
            [
                { action: { type: "text", label: "⭐ 1" }, color: "secondary" },
                { action: { type: "text", label: "⭐⭐ 2" }, color: "secondary" },
                { action: { type: "text", label: "⭐⭐⭐ 3" }, color: "secondary" },
                { action: { type: "text", label: "⭐⭐⭐⭐ 4" }, color: "secondary" }
            ],
            [
                { action: { type: "text", label: "⭐⭐⭐⭐⭐ 5" }, color: "positive" },
                { action: { type: "text", label: "❌ Отмена" }, color: "secondary" }
            ]
        ]
    };
    return JSON.stringify(keyboard);
}

function getPDFReportKeyboard() {
    const keyboard = {
        one_time: false,
        buttons: [
            [
                { action: { type: "text", label: "📊 Все заявки" }, color: "primary" },
                { action: { type: "text", label: "🟡 Новые" }, color: "primary" },
                { action: { type: "text", label: "🔵 В работе" }, color: "primary" },
                { action: { type: "text", label: "🟢 Решенные" }, color: "positive" }
            ],
            [
                { action: { type: "text", label: "⚪ Закрытые" }, color: "secondary" },
                { action: { type: "text", label: "📅 За сегодня" }, color: "secondary" },
                { action: { type: "text", label: "📅 За неделю" }, color: "secondary" },
                { action: { type: "text", label: "❌ Отмена" }, color: "secondary" }
            ]
        ]
    };
    return JSON.stringify(keyboard);
}

async function sendMainMenu(context) {
    await context.send({
        message: '🏫 Анапский Индустриальный Техникум\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🤖 Техническая поддержка\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📌 Доступные команды:\n\n📝 Новая заявка\n📋 Мои заявки\n🗑️ Удалить заявку\n📊 Статистика\n📄 Скачать отчет\n❓ FAQ\n📞 Контакты\n⭐ Оценить работу\n\n👇 Нажмите на кнопку, чтобы выбрать действие:',
        keyboard: getMainKeyboard()
    });
}

function cleanMessage(text) {
    if (!text) return '';
    let cleaned = text.replace(/\[club\d+\|.*?\]/gi, '');
    cleaned = cleaned.replace(/@club\d+/gi, '');
    cleaned = cleaned.replace(/\[id\d+\|.*?\]/gi, '');
    cleaned = cleaned.trim();
    return cleaned;
}

// ========== НОВАЯ ЗАЯВКА ==========

async function startNewTicket(context) {
    const userId = context.senderId;
    if (userStates.has(userId)) {
        await context.send('⏳ У вас уже есть активная заявка. Напишите "❌ Отмена" чтобы начать заново.');
        return;
    }
    
    userStates.set(userId, {
        action: 'new_ticket',
        step: 1,
        fullName: '',
        groupNumber: '',
        category: '',
        phone: '',
        description: ''
    });
    
    await context.send({
        message: '📝 Создание новой заявки\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n👇 Шаг 1 из 5: Выберите категорию проблемы:',
        keyboard: getCategoryKeyboard()
    });
}

async function continueNewTicket(context, userState, messageText) {
    const userId = context.senderId;
    
    switch (userState.step) {
        case 1:
            const categories = ['💻 Компьютер/ПО', '🌐 Интернет/Wi-Fi', '🔑 Доступы/Пароль', 
                               '🖨️ Принтер/Сканер', '📧 Почта/Документы', '💾 Установка ПО', 
                               '🔧 Оборудование', '❓ Другое'];
            if (categories.includes(messageText)) {
                userState.category = messageText;
                userState.step = 2;
                await context.send('📝 Шаг 2 из 5: Введите ваше ФИО полностью:');
            } else if (messageText === '❌ Отмена') {
                await cancelAction(context);
            } else {
                await context.send('❌ Пожалуйста, выберите категорию, нажав на кнопку.');
            }
            break;
        case 2:
            if (messageText.length < 2) {
                await context.send('❌ Введите полное ФИО (минимум 2 символа):');
                return;
            }
            userState.fullName = messageText;
            userState.step = 3;
            await context.send('📚 Шаг 3 из 5: Введите номер вашей группы:');
            break;
        case 3:
            if (messageText.length < 2) {
                await context.send('❌ Введите номер группы:');
                return;
            }
            userState.groupNumber = messageText;
            userState.step = 4;
            await context.send('📞 Шаг 4 из 5: Введите ваш контактный телефон:');
            break;
        case 4:
            if (messageText.length < 5) {
                await context.send('❌ Введите корректный номер телефона:');
                return;
            }
            userState.phone = messageText;
            userState.step = 5;
            await context.send('📝 Шаг 5 из 5: Опишите вашу проблему:');
            break;
        case 5:
            if (messageText.length < 5) {
                await context.send('❌ Опишите проблему подробнее (минимум 5 символов):');
                return;
            }
            userState.description = messageText;
            await saveTicketToDatabase(context, userState);
            break;
    }
    
    if (userState.step <= 5 && userStates.has(userId)) {
        userStates.set(userId, userState);
    }
}

async function saveTicketToDatabase(context, userState) {
    const userId = context.senderId;
    
    try {
        const [result] = await db.execute(
            `INSERT INTO tickets (
                vk_user_id, full_name, group_number, contact_phone,
                problem_type, description, status
            ) VALUES (?, ?, ?, ?, ?, ?, 'new')`,
            [userId, userState.fullName, userState.groupNumber,
             userState.phone, userState.category, userState.description]
        );
        
        await context.send({
            message: `✅ Заявка №${result.insertId} создана!\n\n` +
                     `👤 ФИО: ${userState.fullName}\n` +
                     `📚 Группа: ${userState.groupNumber}\n` +
                     `📞 Телефон: ${userState.phone}\n` +
                     `📂 Категория: ${userState.category}\n` +
                     `📝 Описание: ${userState.description}\n\n` +
                     `🟢 Статус: Новая`,
            keyboard: getMainKeyboard()
        });
        
        userStates.delete(userId);
    } catch (error) {
        console.error('Ошибка БД:', error);
        await context.send('❌ Ошибка при сохранении заявки. Попробуйте позже.');
        userStates.delete(userId);
    }
}

async function showMyTickets(context) {
    const userId = context.senderId;
    
    try {
        const [tickets] = await db.execute(
            'SELECT id, problem_type, status, created_at FROM tickets WHERE vk_user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        
        if (tickets.length === 0) {
            await context.send('📭 У вас пока нет заявок');
            return;
        }
        
        let message = '📋 Ваши заявки\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
        for (const ticket of tickets) {
            let statusText = '';
            if (ticket.status === 'new') statusText = '🟡 Новая';
            else if (ticket.status === 'in_progress') statusText = '🔵 В работе';
            else if (ticket.status === 'resolved') statusText = '🟢 Решена';
            else statusText = '⚪ Закрыта';
            
            const date = new Date(ticket.created_at).toLocaleString('ru-RU');
            message += `📌 №${ticket.id} | ${ticket.problem_type}\n`;
            message += `   ${statusText}\n`;
            message += `   📅 ${date}\n\n`;
        }
        await context.send({ message: message, keyboard: getMainKeyboard() });
    } catch (error) {
        console.error(error);
        await context.send('❌ Ошибка при получении заявок');
    }
}


async function startDeleteTicket(context) {
    const userId = context.senderId;
    
    try {
        const [tickets] = await db.execute(
            'SELECT id, problem_type FROM tickets WHERE vk_user_id = ? AND status != "closed"',
            [userId]
        );
        
        if (tickets.length === 0) {
            await context.send('📭 Нет активных заявок для удаления');
            return;
        }
        
        let message = '🗑️ Удаление заявки\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚠️ Внимание! Удаление заявки необратимо.\n\n👇 Введите номер заявки для удаления:\n\n';
        for (const ticket of tickets) {
            message += `• №${ticket.id} - ${ticket.problem_type}\n`;
        }
        
        await context.send(message);
        userStates.set(userId, { action: 'delete_ticket' });
    } catch (error) {
        console.error(error);
        await context.send('❌ Ошибка при получении заявок');
    }
}

async function deleteTicket(context, ticketId) {
    const userId = context.senderId;
    
    try {
        const [result] = await db.execute(
            'DELETE FROM tickets WHERE id = ? AND vk_user_id = ?',
            [ticketId, userId]
        );
        
        if (result.affectedRows === 0) {
            await context.send(`❌ Заявка №${ticketId} не найдена`);
        } else {
            await context.send(`✅ Заявка №${ticketId} успешно удалена!`);
        }
        
        userStates.delete(userId);
        await sendMainMenu(context);
    } catch (error) {
        console.error(error);
        await context.send('❌ Ошибка при удалении заявки');
    }
}


async function getStatistics(context) {
    const userId = context.senderId;
    
    try {
        const [total] = await db.execute('SELECT COUNT(*) as count FROM tickets WHERE vk_user_id = ?', [userId]);
        const [newT] = await db.execute('SELECT COUNT(*) as count FROM tickets WHERE vk_user_id = ? AND status = "new"', [userId]);
        const [inProgress] = await db.execute('SELECT COUNT(*) as count FROM tickets WHERE vk_user_id = ? AND status = "in_progress"', [userId]);
        const [resolved] = await db.execute('SELECT COUNT(*) as count FROM tickets WHERE vk_user_id = ? AND status = "resolved"', [userId]);
        
        const percent = total[0].count === 0 ? 0 : Math.round(resolved[0].count / total[0].count * 100);
        
        await context.send(
            `📊 Ваша статистика\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📋 Всего заявок: ${total[0].count}\n` +
            `🟡 В ожидании: ${newT[0].count}\n` +
            `🔵 В работе: ${inProgress[0].count}\n` +
            `🟢 Решено: ${resolved[0].count}\n\n` +
            `⭐ Процент решенных: ${percent}%`
        );
    } catch (error) {
        console.error(error);
        await context.send('❌ Ошибка при получении статистики');
    }
}


async function generateAndSendPDF(context, filter) {
    const userId = context.senderId;
    let title = 'Все заявки';
    let sql = 'SELECT * FROM tickets ORDER BY created_at DESC';
    
    if (filter === 'new') {
        sql = "SELECT * FROM tickets WHERE status = 'new' ORDER BY created_at DESC";
        title = 'Новые заявки';
    } else if (filter === 'in_progress') {
        sql = "SELECT * FROM tickets WHERE status = 'in_progress' ORDER BY created_at DESC";
        title = 'Заявки в работе';
    } else if (filter === 'resolved') {
        sql = "SELECT * FROM tickets WHERE status = 'resolved' ORDER BY created_at DESC";
        title = 'Решенные заявки';
    } else if (filter === 'closed') {
        sql = "SELECT * FROM tickets WHERE status = 'closed' ORDER BY created_at DESC";
        title = 'Закрытые заявки';
    } else if (filter === 'today') {
        sql = "SELECT * FROM tickets WHERE DATE(created_at) = CURDATE() ORDER BY created_at DESC";
        title = 'Заявки за сегодня';
    } else if (filter === 'week') {
        sql = "SELECT * FROM tickets WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) ORDER BY created_at DESC";
        title = 'Заявки за неделю';
    }
    
    try {
        const [tickets] = await db.execute(sql);
        
        if (tickets.length === 0) {
            await context.send('📭 Нет заявок для формирования отчета.');
            return;
        }
        
        let tableRows = '';
        for (const ticket of tickets) {
            let statusText = '';
            if (ticket.status === 'new') statusText = 'Новая';
            else if (ticket.status === 'in_progress') statusText = 'В работе';
            else if (ticket.status === 'resolved') statusText = 'Решена';
            else statusText = 'Закрыта';
            
            let shortDescription = ticket.description;
            if (shortDescription.length > 50) {
                shortDescription = shortDescription.substring(0, 50) + '…';
            }
            
            tableRows += `
                <tr>
                    <td style="padding:5px;">${ticket.id}</td>
                    <td style="padding:5px;">${new Date(ticket.created_at).toLocaleDateString('ru-RU')}</td>
                    <td style="padding:5px;">${ticket.full_name}</td>
                    <td style="padding:5px;">${ticket.group_number}</td>
                    <td style="padding:5px;">${ticket.problem_type}</td>
                    <td style="padding:5px;">${shortDescription}</td>
                    <td style="padding:5px;">${ticket.contact_phone || '—'}</td>
                    <td style="padding:5px;">${statusText}</td>
                </tr>
            `;
        }
        
        const html = `
            <html>
            <head><meta charset="UTF-8"><title>${title}</title>
            <style>
                body { font-family: Arial; margin: 20px; }
                h1 { color: #2c3e50; text-align: center; }
                table { width: 100%; border-collapse: collapse; }
                th { background: #3498db; color: white; padding: 8px; }
                td { border: 1px solid #ddd; padding: 6px; }
                .footer { margin-top: 20px; text-align: center; }
            </style>
            </head>
            <body>
                <h1>Анапский Индустриальный Техникум</h1>
                <h2>${title}</h2>
                <div>Дата: ${new Date().toLocaleString('ru-RU')}</div>
                <table border="1">
                    <thead><tr><th>ID</th><th>Дата</th><th>ФИО</th><th>Группа</th><th>Категория</th><th>Описание</th><th>Телефон</th><th>Статус</th></tr></thead>
                    <tbody>${tableRows}</tbody>
                </table>
                <div class="footer">Всего заявок: ${tickets.length}</div>
            </body>
            </html>
        `;
        
        const options = { format: 'A4', orientation: 'landscape', border: '10mm' };
        const pdfPath = `./report_${filter}_${Date.now()}.pdf`;
        const document = { html: html, data: {}, path: pdfPath, type: 'file' };
        
        await pdf.create(document, options);
        
        const pdfBuffer = fs.readFileSync(pdfPath);
        const uploadServer = await vk.api.docs.getMessagesUploadServer({ type: 'doc', peer_id: userId });
        
        const formData = new FormData();
        formData.append('file', pdfBuffer, {
            filename: `Отчет_${filter}.pdf`,
            contentType: 'application/pdf'
        });
        
        const uploadResponse = await fetch(uploadServer.upload_url, { method: 'POST', body: formData });
        const uploadResult = await uploadResponse.json();
        
        if (!uploadResult.file) {
            throw new Error('Не удалось загрузить файл');
        }
        
        const savedDoc = await vk.api.docs.save({ file: uploadResult.file });
        
        await context.send({
            message: `📄 *${title}*\nВсего заявок: ${tickets.length}`,
            attachment: `doc${savedDoc[0].owner_id}_${savedDoc[0].id}`
        });
        
        fs.unlinkSync(pdfPath);
        
    } catch (error) {
        console.error('Ошибка PDF:', error);
        await context.send('❌ Ошибка при генерации PDF-отчета.');
    }
}


async function sendFAQ(context) {
    await context.send({
        message: '❓ Часто задаваемые вопросы\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
                 '📝 Как создать заявку? - Нажмите "📝 Новая заявка"\n\n' +
                 '🔍 Как узнать статус? - Нажмите "📋 Мои заявки"\n\n' +
                 '🗑️ Как удалить заявку? - Нажмите "🗑️ Удалить заявку"\n\n' +
                 '⏱️ Среднее время ответа - 30 минут\n\n' +
                 '🚨 Срочная проблема? - Звоните: 8-86133-5-25-45',
        keyboard: getMainKeyboard()
    });
}

async function sendContacts(context) {
    await context.send({
        message: '📞 Контакты техподдержки\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
                 '🏫 Анапский Индустриальный Техникум\n' +
                 '📍 Адрес: г. Анапа, ул. Крымская, 99\n\n' +
                 '📞 Телефон: 8-86133-5-25-45\n' +
                 '📧 Email: support@anapaindustrial.ru\n\n' +
                 '🕐 Режим работы: Пн-Пт 9:00-18:00\n\n' +
                 '🚨 Аварийный: +7-918-123-45-67',
        keyboard: getMainKeyboard()
    });
}

async function startRating(context) {
    const userId = context.senderId;
    userStates.set(userId, { action: 'rating' });
    
    await context.send({
        message: '⭐ Оцените качество работы\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n👇 Выберите оценку:',
        keyboard: getRatingKeyboard()
    });
}

async function saveRating(context, rating) {
    const userId = context.senderId;
    
    try {
        const [existing] = await db.execute(
            'SELECT * FROM ratings WHERE vk_user_id = ? AND DATE(created_at) = CURDATE()',
            [userId]
        );
        
        if (existing.length > 0) {
            await context.send('🙏 Вы уже оценивали нашу работу сегодня');
            userStates.delete(userId);
            return;
        }
        
        await db.execute(
            'INSERT INTO ratings (vk_user_id, rating, created_at) VALUES (?, ?, NOW())',
            [userId, rating]
        );
        
        const stars = '⭐'.repeat(parseInt(rating));
        await context.send(`⭐ Спасибо за оценку ${stars}!`);
        userStates.delete(userId);
        await sendMainMenu(context);
    } catch (error) {
        console.error(error);
        await context.send('❌ Ошибка при сохранении оценки');
    }
}

async function showMyRating(context) {
    const userId = context.senderId;
    
    try {
        const [ratings] = await db.execute(
            'SELECT rating, created_at FROM ratings WHERE vk_user_id = ? ORDER BY created_at DESC LIMIT 1',
            [userId]
        );
        
        if (ratings.length === 0) {
            await context.send('⭐ Вы еще не оценивали нашу работу.\n\nНапишите "⭐ Оценить работу" чтобы оставить отзыв.');
            return;
        }
        
        const stars = '⭐'.repeat(ratings[0].rating);
        const date = new Date(ratings[0].created_at).toLocaleString('ru-RU');
        
        await context.send(
            `⭐ Ваша последняя оценка: ${stars}\n` +
            `📅 Дата: ${date}\n\n` +
            `Спасибо, что помогаете нам становиться лучше!`
        );
    } catch (error) {
        console.error(error);
        await context.send('❌ Ошибка при получении оценки');
    }
}

async function showAllRatings(context) {
    const userId = context.senderId;
    
    const ADMIN_IDS = [582813106];
    
    if (!ADMIN_IDS.includes(userId)) {
        await context.send('❌ У вас нет прав для просмотра этой информации.');
        return;
    }
    
    try {
        const [total] = await db.execute('SELECT COUNT(*) as count, AVG(rating) as avg FROM ratings');
        const [today] = await db.execute('SELECT COUNT(*) as count, AVG(rating) as avg FROM ratings WHERE DATE(created_at) = CURDATE()');
        const [week] = await db.execute('SELECT COUNT(*) as count, AVG(rating) as avg FROM ratings WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)');
        
        const [ratings] = await db.execute('SELECT rating, created_at, vk_user_id FROM ratings ORDER BY created_at DESC LIMIT 10');
        
        let message = '📊 Статистика оценок\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
        message += `📋 Всего оценок: ${total[0].count}\n`;
        message += `⭐ Средний балл: ${Math.round(total[0].avg * 10) / 10}\n\n`;
        message += `📅 За сегодня: ${today[0].count} оценок\n`;
        message += `📅 За неделю: ${week[0].count} оценок\n\n`;
        message += `🕐 Последние 10 оценок:\n\n`;
        
        for (const r of ratings) {
            const stars = '⭐'.repeat(r.rating);
            message += `${stars} | ${new Date(r.created_at).toLocaleDateString()}\n`;
        }
        
        await context.send(message);
    } catch (error) {
        console.error(error);
        await context.send('❌ Ошибка при получении статистики оценок');
    }
}

async function cancelAction(context) {
    const userId = context.senderId;
    userStates.delete(userId);
    await sendMainMenu(context);
}


vk.updates.on('message_new', async (context) => {
    if (context.senderId < 0) return;
    
    let messageText = context.text?.trim() || '';
    const originalText = messageText;
    const userId = context.senderId;
    const userState = userStates.get(userId);
    
    messageText = messageText.replace(/\[club\d+\|.*?\]/gi, '');
    messageText = messageText.replace(/@club\d+/gi, '');
    messageText = messageText.replace(/\[id\d+\|.*?\]/gi, '');
    messageText = messageText.trim();
    
    if (messageText === '') {
        if (originalText.includes('Новая заявка') || originalText.includes('📝 Новая заявка')) messageText = '📝 Новая заявка';
        else if (originalText.includes('Мои заявки') || originalText.includes('📋 Мои заявки')) messageText = '📋 Мои заявки';
        else if (originalText.includes('Удалить заявку') || originalText.includes('🗑️ Удалить заявку')) messageText = '🗑️ Удалить заявку';
        else if (originalText.includes('Статистика') || originalText.includes('📊 Статистика')) messageText = '📊 Статистика';
        else if (originalText.includes('Скачать отчет') || originalText.includes('📄 Скачать отчет')) messageText = '📄 Скачать отчет';
        else if (originalText.includes('FAQ') || originalText.includes('❓ FAQ')) messageText = '❓ FAQ';
        else if (originalText.includes('Контакты') || originalText.includes('📞 Контакты')) messageText = '📞 Контакты';
        else if (originalText.includes('Оценить работу') || originalText.includes('⭐ Оценить работу')) messageText = '⭐ Оценить работу';
        else if (originalText.includes('Моя оценка')) messageText = 'Моя оценка';
        else if (originalText.includes('Все оценки')) messageText = 'Все оценки';
    }
    
    if (messageText === '❌ Отмена' || messageText === 'Отмена') {
        await cancelAction(context);
        return;
    }
    
    if (userState) {
        if (userState.action === 'new_ticket') {
            await continueNewTicket(context, userState, messageText);
            return;
        }
        if (userState.action === 'delete_ticket') {
            const num = parseInt(messageText);
            if (!isNaN(num)) {
                await deleteTicket(context, num);
            } else {
                await context.send('❌ Введите номер заявки цифрой');
            }
            return;
        }
        if (userState.action === 'rating') {
            if (['1', '2', '3', '4', '5'].includes(messageText)) {
                await saveRating(context, messageText);
            } else if (messageText === '❌ Отмена') {
                await cancelAction(context);
            } else {
                await context.send('❌ Пожалуйста, выберите оценку от 1 до 5');
            }
            return;
        }
        if (userState.action === 'pdf_report') {
            if (messageText === '📊 Все заявки') await generateAndSendPDF(context, 'all');
            else if (messageText === '🟡 Новые') await generateAndSendPDF(context, 'new');
            else if (messageText === '🔵 В работе') await generateAndSendPDF(context, 'in_progress');
            else if (messageText === '🟢 Решенные') await generateAndSendPDF(context, 'resolved');
            else if (messageText === '⚪ Закрытые') await generateAndSendPDF(context, 'closed');
            else if (messageText === '📅 За сегодня') await generateAndSendPDF(context, 'today');
            else if (messageText === '📅 За неделю') await generateAndSendPDF(context, 'week');
            else if (messageText === '❌ Отмена') {
                userStates.delete(userId);
                await sendMainMenu(context);
            } else {
                await context.send('❌ Выберите тип отчета из кнопок');
            }
            userStates.delete(userId);
            return;
        }
    }
    
    // ПРОВЕРКА КОМАНД
    if (messageText === '📝 Новая заявка') {
        await startNewTicket(context);
        return;
    }
    if (messageText === '📋 Мои заявки') {
        await showMyTickets(context);
        return;
    }
    if (messageText === '🗑️ Удалить заявку') {
        await startDeleteTicket(context);
        return;
    }
    if (messageText === '📊 Статистика') {
        await getStatistics(context);
        return;
    }
    if (messageText === '📄 Скачать отчет') {
        userStates.set(userId, { action: 'pdf_report' });
        await context.send({ message: '📊 Выберите тип отчета:', keyboard: getPDFReportKeyboard() });
        return;
    }
    if (messageText === '❓ FAQ') {
        await sendFAQ(context);
        return;
    }
    if (messageText === '📞 Контакты') {
        await sendContacts(context);
        return;
    }
    if (messageText === '⭐ Оценить работу') {
        await startRating(context);
        return;
    }
    if (messageText === 'Моя оценка') {
        await showMyRating(context);
        return;
    }
    if (messageText === 'Все оценки') {
        await showAllRatings(context);
        return;
    }
    
    await sendMainMenu(context);
});


async function initDatabase() {
    try {
        await db.execute(`CREATE TABLE IF NOT EXISTS ratings (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT,
            vk_user_id INT UNSIGNED NOT NULL,
            rating INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        )`);
        console.log('✅ База данных готова');
    } catch (error) {
        console.error('Ошибка БД:', error);
    }
}

initDatabase();
vk.updates.start().catch(console.error);

console.log(`

    БОТ ТЕХНИЧЕСКОЙ ПОДДЕРЖКИ ЗАПУЩЕН
`);