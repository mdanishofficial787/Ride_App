const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.BREVO_HOST,
            port: parseInt(process.env.BREVO_PORT),
            secure: false,
            auth: {
                user: process.env.BREVO_USER,
                pass: process.env.BREVO_SMTP_KEY
            }
        });

        const mailOptions = {
            from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
            to: options.email,
            subject: options.subject,
            html: options.html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error('❌ Email sending failed: ', error);
        return { success: false, error: error.message };
    }
};

module.exports = sendEmail;