var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
let EmailService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var EmailService = _classThis = class {
        constructor(configService) {
            this.configService = configService;
            const smtpPort = this.configService.get('SMTP_PORT', 587);
            const smtpSecure = this.configService.get('SMTP_SECURE', 'false') === 'true' || smtpPort === 465;
            this.transporter = nodemailer.createTransport({
                host: this.configService.get('SMTP_HOST', 'smtp.gmail.com'),
                port: smtpPort,
                secure: smtpSecure, // true for 465, false for other ports
                auth: {
                    user: this.configService.get('SMTP_USER'),
                    pass: this.configService.get('SMTP_PASS'),
                },
            });
        }
        async sendPasswordResetEmail(email, name, resetToken) {
            const resetUrl = `${this.configService.get('FRONTEND_URL', 'http://localhost:8081')}/reset-password?token=${resetToken}`;
            const mailOptions = {
                from: this.configService.get('SMTP_FROM', 'noreply@splitwise-plus.com'),
                to: email,
                subject: 'Reset Your Password - Splitwise+',
                html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #32a852;">Reset Your Password</h2>
          <p>Hello ${name},</p>
          <p>You requested to reset your password for your Splitwise+ account.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #32a852; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">This email was sent from Splitwise+</p>
        </div>
      `,
            };
            try {
                await this.transporter.sendMail(mailOptions);
                console.log(`Password reset email sent to ${email}`);
            }
            catch (error) {
                console.error('Failed to send password reset email:', error);
                throw new Error('Failed to send password reset email');
            }
        }
        async sendGroupInviteEmail(email, groupName, inviterName, inviteToken) {
            const acceptUrl = `${this.configService.get('FRONTEND_URL', 'http://localhost:8081')}/accept-invite?token=${inviteToken}`;
            const mailOptions = {
                from: this.configService.get('SMTP_FROM', 'noreply@splitwise-plus.com'),
                to: email,
                subject: `You're invited to join "${groupName}" on Splitwise+`,
                html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #32a852;">You've Been Invited!</h2>
          <p>Hello,</p>
          <p><strong>${inviterName}</strong> has invited you to join the group <strong>"${groupName}"</strong> on Splitwise+.</p>
          <p>Click the button below to accept the invitation:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${acceptUrl}" style="background-color: #32a852; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${acceptUrl}</p>
          <p>Once you accept, you'll be able to track and split expenses with the group members.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">This email was sent from Splitwise+</p>
        </div>
      `,
            };
            try {
                await this.transporter.sendMail(mailOptions);
                console.log(`Group invite email sent to ${email} for group ${groupName}`);
            }
            catch (error) {
                console.error('Failed to send group invite email:', error);
                // Don't throw error, just log it
            }
        }
    };
    __setFunctionName(_classThis, "EmailService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        EmailService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return EmailService = _classThis;
})();
export { EmailService };
