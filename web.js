const express = require('express');
const path = require('path');
const pdf = require('pdf-creator-node');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Главная страница
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Отчеты техподдержки АИТ</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    max-width: 600px;
                    margin: 50px auto;
                    padding: 20px;
                    background: #f5f5f5;
                }
                .container {
                    background: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                h1 {
                    color: #2c3e50;
                    text-align: center;
                }
                select, button {
                    width: 100%;
                    padding: 12px;
                    margin: 10px 0;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                    font-size: 16px;
                }
                button {
                    background: #3498db;
                    color: white;
                    cursor: pointer;
                    border: none;
                }
                button:hover {
                    background: #2980b9;
                }
                .footer {
                    text-align: center;
                    margin-top: 20px;
                    font-size: 12px;
                    color: #999;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>📊 Анапский Индустриальный Техникум</h1>
                <h2 style="text-align:center;">Система технической поддержки</h2>
                <form action="/generate-pdf" method="POST">
                    <label>Выберите статус заявок:</label>
                    <select name="status">
                        <option value="all">📋 Все заявки</option>
                        <option value="new">🟡 Новые</option>
                        <option value="in_progress">🔵 В работе</option>
                        <option value="resolved">🟢 Решенные</option>
                        <option value="closed">⚪ Закрытые</option>
                    </select>
                    <button type="submit">📄 Скачать PDF-отчет</button>
                </form>
                <div class="footer">
                    Анапский Индустриальный Техникум<br>
                    Система технической поддержки
                </div>
            </div>
        </body>
        </html>
    `);
});

// Генерация PDF (ВЕРТИКАЛЬНЫЙ ФОРМАТ)
app.post('/generate-pdf', async (req, res) => {
    try {
        const status = req.body.status;
        
        let sqlQuery = 'SELECT * FROM tickets';
        let params = [];
        
        if (status !== 'all') {
            sqlQuery += ' WHERE status = ?';
            params.push(status);
        }
        
        sqlQuery += ' ORDER BY created_at DESC';
        
        const [tickets] = await db.execute(sqlQuery, params);
        
        if (tickets.length === 0) {
            return res.send(`
                <h3 style="color:red;">Нет заявок для формирования отчета</h3>
                <a href="/">← Вернуться назад</a>
            `);
        }
        
        // Получаем название фильтра для заголовка
        let statusTitle = '';
        switch(status) {
            case 'all': statusTitle = 'Все заявки'; break;
            case 'new': statusTitle = 'Новые заявки'; break;
            case 'in_progress': statusTitle = 'Заявки в работе'; break;
            case 'resolved': statusTitle = 'Решенные заявки'; break;
            case 'closed': statusTitle = 'Закрытые заявки'; break;
            default: statusTitle = 'Заявки';
        }
        
        // Формируем HTML для PDF (ВЕРТИКАЛЬНЫЙ ФОРМАТ)
        let tableRows = '';
        for (const ticket of tickets) {
            // Обрезаем длинные описания
            let shortDescription = ticket.description;
            if (shortDescription.length > 35) {
                shortDescription = shortDescription.substring(0, 35) + '…';
            }
            
            // Форматируем дату
            let formattedDate = new Date(ticket.created_at).toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Статус на русском
            let statusText = '';
            if (ticket.status === 'new') statusText = 'Новая';
            else if (ticket.status === 'in_progress') statusText = 'В работе';
            else if (ticket.status === 'resolved') statusText = 'Решена';
            else statusText = 'Закрыта';
            
            tableRows += `
                <tr>
                    <td style="text-align:center; padding:5px;">${ticket.id}</td>
                    <td style="padding:5px; font-size:9px;">${formattedDate}</td>
                    <td style="padding:5px;">${ticket.full_name}</td>
                    <td style="text-align:center; padding:5px;">${ticket.group_number}</td>
                    <td style="padding:5px; font-size:9px;">${ticket.problem_type}</td>
                    <td style="padding:5px; font-size:9px;">${shortDescription}</td>
                    <td style="text-align:center; padding:5px;">${ticket.contact_phone || '—'}</td>
                    <td style="text-align:center; padding:5px;">${statusText}</td>
                </tr>
            `;
        }
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Отчет по заявкам</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: 'DejaVu Sans', 'Arial', sans-serif;
                        font-size: 9px;
                        padding: 8px;
                        margin: 0;
                    }
                    h1 {
                        color: #2c3e50;
                        text-align: center;
                        font-size: 16px;
                        margin-bottom: 5px;
                    }
                    h2 {
                        text-align: center;
                        color: #555;
                        font-size: 12px;
                        margin-bottom: 5px;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 10px;
                        border-bottom: 2px solid #3498db;
                        padding-bottom: 8px;
                    }
                    .date {
                        text-align: center;
                        color: #7f8c8d;
                        font-size: 8px;
                        margin-bottom: 10px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 8px;
                    }
                    th {
                        background: #3498db;
                        color: white;
                        padding: 5px 2px;
                        text-align: center;
                        font-weight: bold;
                        font-size: 8px;
                        border: 1px solid #2980b9;
                    }
                    td {
                        border: 1px solid #ddd;
                        vertical-align: top;
                        font-size: 8px;
                    }
                    tr:nth-child(even) {
                        background: #f9f9f9;
                    }
                    .footer {
                        margin-top: 15px;
                        text-align: center;
                        font-size: 7px;
                        color: #999;
                        border-top: 1px solid #ddd;
                        padding-top: 8px;
                    }
                    .count {
                        text-align: right;
                        font-weight: bold;
                        margin-top: 10px;
                        font-size: 8px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Анапский Индустриальный Техникум</h1>
                    <h2>${statusTitle}</h2>
                </div>
                <div class="date">
                    Дата формирования: ${new Date().toLocaleString('ru-RU')}
                </div>
                <table cellspacing="0" cellpadding="0">
                    <thead>
                        <tr>
                            <th style="width:5%;">№</th>
                            <th style="width:12%;">Дата</th>
                            <th style="width:20%;">ФИО</th>
                            <th style="width:8%;">Группа</th>
                            <th style="width:15%;">Категория</th>
                            <th style="width:20%;">Описание</th>
                            <th style="width:10%;">Телефон</th>
                            <th style="width:10%;">Статус</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
                <div class="count">
                    Всего заявок: ${tickets.length}
                </div>
                <div class="footer">
                    Анапский Индустриальный Техникум • Система технической поддержки<br>
                    Документ сгенерирован автоматически
                </div>
            </body>
            </html>
        `;
        
        // НАСТРОЙКИ PDF - ВЕРТИКАЛЬНАЯ ОРИЕНТАЦИЯ
        const options = {
            format: 'A4',
            orientation: 'portrait',  // ВЕРТИКАЛЬНАЯ ориентация
            border: {
                top: '8mm',
                right: '5mm',
                bottom: '8mm',
                left: '5mm'
            },
            timeout: 30000,
            zoomFactor: 0.95
        };
        
        const pdfPath = `./report_${status}_${Date.now()}.pdf`;
        const document = {
            html: html,
            data: {},
            path: pdfPath,
            type: 'file'
        };
        
        await pdf.create(document, options);
        
        // Отправляем PDF пользователю
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=report_${status}_${Date.now()}.pdf`);
        
        const pdfStream = fs.createReadStream(pdfPath);
        pdfStream.pipe(res);
        
        // Удаляем файл после отправки
        pdfStream.on('end', () => {
            try { fs.unlinkSync(pdfPath); } catch(e) {}
        });
        
    } catch (error) {
        console.error('Ошибка генерации PDF:', error);
        res.status(500).send('Ошибка при генерации PDF: ' + error.message);
    }
});

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║     🌐 ВЕБ-ИНТЕРФЕЙС ДЛЯ PDF-ОТЧЕТОВ ЗАПУЩЕН                ║
║     📍 Открыть в браузере: http://localhost:${PORT}          ║
║     📄 PDF генерируется в ВЕРТИКАЛЬНОЙ ориентации A4        ║
╚══════════════════════════════════════════════════════════════╝
    `);
});