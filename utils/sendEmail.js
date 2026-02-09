const nodemailer = require('nodemailer');

const sendemail = async (options) => {
    try {
        // transporter
        const transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE,
            auth:{
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD
            }
        });
        //defining mail options
        const mailoptions = {
            from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
            to: options.email,
            subject: options.subject,
            html: options.html
        };

        //send email
        const info = await transporter.sendMail(mailoptions);

        console.log('Email sent:',info.messageId);
        return {success: true, messageId: info.messageId };
    }
    catch (error) {
        console.error('Email sending failed: ', error);
        return { success: false, error: error.message };
    }
};

module.exports = sendemail;