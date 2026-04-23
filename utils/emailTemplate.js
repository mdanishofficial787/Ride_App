//otp verification email

exports.otpverificationTemplate = (fullname, otp) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 50px auto;
          background-color: #ffffff;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          padding-bottom: 20px;
          border-bottom: 2px solid #4CAF50;
        }
        .header h1 {
          color: #4CAF50;
          margin: 0;
        }
        .content {
          padding: 30px 0;
          text-align: center;
        }
        .otp-box {
          background-color: #f9f9f9;
          border: 2px dashed #4CAF50;
          padding: 20px;
          margin: 20px 0;
          border-radius: 8px;
        }
        .otp-code {
          font-size: 36px;
          font-weight: bold;
          color: #4CAF50;
          letter-spacing: 10px;
        }
        .footer {
          text-align: center;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
          color: #888;
          font-size: 12px;
        }
        .warning {
          color: #ff6b6b;
          font-size: 14px;
          margin-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1> Ride App</h1>
          <p>Email Verification</p>
        </div>
        
        <div class="content">
          <h2>Hello ${fullname}!</h2>
          <p>Thank you for registering with Ride App.</p>
          <p>Please use the following OTP to verify your email address:</p>
          
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
          
          <p class="warning"> This OTP will expire in 5 minutes</p>
          <p>If you didn't request this verification, please ignore this email.</p>
        </div>
        
        <div class="footer">
          <p>© 2026 Ride App. All rights reserved.</p>
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
    `;
};

//welcome email

exports.welcomeEmailTemplate = (fullname) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 50px auto;
          background-color: #ffffff;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          padding-bottom: 20px;
        }
        .header h1 {
          color: #4CAF50;
          margin: 0;
        }
        .content {
          padding: 20px 0;
          text-align: center;
        }
        .content h2 {
          color: #333;
        }
        .content p {
          color: #666;
          line-height: 1.6;
        }
        .footer {
          text-align: center;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
          color: #888;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1> Welcome to Ride App!</h1>
        </div>
        
        <div class="content">
          <h2>Hi ${fullname}!</h2>
          <p>Your account has been successfully verified.</p>
          <p>You can now enjoy all the features of Ride App.</p>
          <p>Get ready to experience seamless ride sharing!</p>
        </div>
        
        <div class="footer">
          <p>© 2026 Ride App. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};