const NotifyClient = require('../../client/notification.js').NotifyClient;

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const chaiJsonSchema = require('chai-json-schema');
chai.use(chaiAsPromised);
chai.use(chaiJsonSchema);

const should = chai.should();
const expect = chai.expect;

// will not run unless flag provided `npm test --integration`
const describer = process.env.npm_config_integration ? describe.only : describe.skip;

function make_random_id() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 5; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

describer('notification api with a live service', function () {
  // default is 2000 (ms) - api is sometimes slower than this :(
  this.timeout(10000)

  let notifyClient;
  let whitelistNotifyClient;
  let emailNotificationId;
  let smsNotificationId;
  let letterNotificationId;
  const personalisation = { name: 'Foo' };
  const clientRef = 'client-ref';
  const email = process.env.FUNCTIONAL_TEST_EMAIL;
  const phoneNumber = process.env.FUNCTIONAL_TEST_NUMBER;
  const letterContact = {
    address_line_1: make_random_id(),
    address_line_2: 'Foo',
    postcode: 'Bar',
  };
  const smsTemplateId = process.env.SMS_TEMPLATE_ID;
  const smsSenderId = process.env.SMS_SENDER_ID || undefined;
  const emailTemplateId = process.env.EMAIL_TEMPLATE_ID;
  const emailReplyToId = process.env.EMAIL_REPLY_TO_ID || undefined;
  const letterTemplateId = process.env.LETTER_TEMPLATE_ID;

  beforeEach(() => {

    const urlBase = process.env.NOTIFY_API_URL;
    const apiKeyId = process.env.API_KEY
    const inboundSmsKeyId = process.env.INBOUND_SMS_QUERY_KEY;
    const whitelistApiKeyId = process.env.API_SENDING_KEY;
    notifyClient = new NotifyClient(urlBase, apiKeyId);
    whitelistNotifyClient = new NotifyClient(urlBase, whitelistApiKeyId);
    receivedTextClient = new NotifyClient(urlBase, inboundSmsKeyId);
    var definitions_json = require('./schemas/v2/definitions.json');
    chai.tv4.addSchema('definitions.json', definitions_json);

  });

  describe('notifications', () => {

    it('send email notification', () => {
      var postEmailNotificationResponseJson = require('./schemas/v2/POST_notification_email_response.json'),
        options = {personalisation: personalisation, reference: clientRef};

      return notifyClient.sendEmail(emailTemplateId, email, options).then((response) => {
        response.statusCode.should.equal(201);
        expect(response.body).to.be.jsonSchema(postEmailNotificationResponseJson);
        response.body.content.body.should.equal('Hello Foo\r\n\r\nFunctional test help make our world a better place');
        response.body.content.subject.should.equal('Functional Tests are good');
        response.body.reference.should.equal(clientRef);
        emailNotificationId = response.body.id;
      })
    });

    it('send email notification with email_reply_to_id', () => {
      var postEmailNotificationResponseJson = require('./schemas/v2/POST_notification_email_response.json'),
        options = {personalisation: personalisation, reference: clientRef, emailReplyToId: emailReplyToId};

      should.exist(emailReplyToId);
      return notifyClient.sendEmail(emailTemplateId, email, options).then((response) => {
        response.statusCode.should.equal(201);
        expect(response.body).to.be.jsonSchema(postEmailNotificationResponseJson);
        response.body.content.body.should.equal('Hello Foo\r\n\r\nFunctional test help make our world a better place');
        response.body.content.subject.should.equal('Functional Tests are good');
        response.body.reference.should.equal(clientRef);
        emailNotificationId = response.body.id;
      })
    });

    it('send sms notification', () => {
      var postSmsNotificationResponseJson = require('./schemas/v2/POST_notification_sms_response.json'),
        options = {personalisation: personalisation};

      return notifyClient.sendSms(smsTemplateId, phoneNumber, options).then((response) => {
        response.statusCode.should.equal(201);
        expect(response.body).to.be.jsonSchema(postSmsNotificationResponseJson);
        response.body.content.body.should.equal('Hello Foo\n\nFunctional Tests make our world a better place');
        smsNotificationId = response.body.id;
      });
    });

    it('send sms notification with sms_sender_id', () => {
      var postSmsNotificationResponseJson = require('./schemas/v2/POST_notification_sms_response.json'),
        options = {personalisation: personalisation, reference: clientRef, smsSenderId: smsSenderId};

      should.exist(smsSenderId);
      return whitelistNotifyClient.sendSms(smsTemplateId, phoneNumber, options).then((response) => {
        response.statusCode.should.equal(201);
        expect(response.body).to.be.jsonSchema(postSmsNotificationResponseJson);
        response.body.content.body.should.equal('Hello Foo\n\nFunctional Tests make our world a better place');
        smsNotificationId = response.body.id;
      });
    });

    it('send letter notification', () => {
      var postLetterNotificationResponseJson = require('./schemas/v2/POST_notification_letter_response.json'),
        options = {personalisation: letterContact};

      return notifyClient.sendLetter(letterTemplateId, options).then((response) => {
        response.statusCode.should.equal(201);
        expect(response.body).to.be.jsonSchema(postLetterNotificationResponseJson);
        response.body.content.body.should.equal('Hello ' + letterContact.address_line_1);
        letterNotificationId = response.body.id;
      });
    });

    var getNotificationJson = require('./schemas/v2/GET_notification_response.json');
    var getNotificationsJson = require('./schemas/v2/GET_notifications_response.json');

    it('get email notification by id', () => {
      should.exist(emailNotificationId)
      return notifyClient.getNotificationById(emailNotificationId).then((response) => {
        response.statusCode.should.equal(200);
        expect(response.body).to.be.jsonSchema(getNotificationJson);
        response.body.type.should.equal('email');
        response.body.body.should.equal('Hello Foo\r\n\r\nFunctional test help make our world a better place');
        response.body.subject.should.equal('Functional Tests are good');
      });
    });

    it('get sms notification by id', () => {
      should.exist(smsNotificationId)
      return notifyClient.getNotificationById(smsNotificationId).then((response) => {
        response.statusCode.should.equal(200);
        expect(response.body).to.be.jsonSchema(getNotificationJson);
        response.body.type.should.equal('sms');
        response.body.body.should.equal('Hello Foo\n\nFunctional Tests make our world a better place');
      });
    });

    it('get letter notification by id', () => {
      should.exist(letterNotificationId)
      return notifyClient.getNotificationById(letterNotificationId).then((response) => {
        response.statusCode.should.equal(200);
        expect(response.body).to.be.jsonSchema(getNotificationJson);
        response.body.type.should.equal('letter');
        response.body.body.should.equal('Hello ' + letterContact.address_line_1);
      });
    });

    it('get all notifications', () => {
      chai.tv4.addSchema('notification.json', getNotificationJson);
      return notifyClient.getNotifications().then((response) => {
        response.should.have.property('statusCode', 200);
        expect(response.body).to.be.jsonSchema(getNotificationsJson);
      });
    });

  });

  describe('templates', () => {

    var getTemplateJson = require('./schemas/v2/GET_template_by_id.json');
    var getTemplatesJson = require('./schemas/v2/GET_templates_response.json');
    var postTemplatePreviewJson = require('./schemas/v2/POST_template_preview.json');
    var getReceivedTextJson = require('./schemas/v2/GET_received_text_response.json');
    var getReceivedTextsJson = require('./schemas/v2/GET_received_texts_response.json');

    it('get sms template by id', () => {
      return notifyClient.getTemplateById(smsTemplateId).then((response) => {
        response.statusCode.should.equal(200);
        expect(response.body).to.be.jsonSchema(getTemplateJson);
        should.not.exist(response.body.subject);
      });
    });

    it('get email template by id', () => {
      return notifyClient.getTemplateById(emailTemplateId).then((response) => {
        response.statusCode.should.equal(200);
        expect(response.body).to.be.jsonSchema(getTemplateJson);
        response.body.body.should.equal('Hello ((name))\r\n\r\nFunctional test help make our world a better place');
        response.body.subject.should.equal('Functional Tests are good');
      });
    });

    it('get letter template by id', () => {
      return notifyClient.getTemplateById(letterTemplateId).then((response) => {
        response.statusCode.should.equal(200);
        expect(response.body).to.be.jsonSchema(getTemplateJson);
        response.body.body.should.equal('Hello ((address_line_1))');
        response.body.subject.should.equal('Main heading');
      });
    });

    it('get sms template by id and version', () => {
      return notifyClient.getTemplateByIdAndVersion(smsTemplateId, 1).then((response) => {
        response.statusCode.should.equal(200);
        expect(response.body).to.be.jsonSchema(getTemplateJson);
        should.not.exist(response.body.subject);
        response.body.version.should.equal(1);
      });
    });

    it('get email template by id and version', () => {
      return notifyClient.getTemplateByIdAndVersion(emailTemplateId, 1).then((response) => {
        response.statusCode.should.equal(200);
        expect(response.body).to.be.jsonSchema(getTemplateJson);
        response.body.version.should.equal(1);
      });
    });

    it('get letter template by id and version', () => {
      return notifyClient.getTemplateByIdAndVersion(letterTemplateId, 1).then((response) => {
        response.statusCode.should.equal(200);
        expect(response.body).to.be.jsonSchema(getTemplateJson);
        response.body.version.should.equal(1);
      });
    });

    it('get all templates', () => {
      return notifyClient.getAllTemplates().then((response) => {
        response.statusCode.should.equal(200);
        expect(response.body).to.be.jsonSchema(getTemplatesJson);
      });
    });

    it('get sms templates', () => {
      return notifyClient.getAllTemplates('sms').then((response) => {
        response.statusCode.should.equal(200);
        expect(response.body).to.be.jsonSchema(getTemplatesJson);
      });
    });

    it('get email templates', () => {
      return notifyClient.getAllTemplates('email').then((response) => {
        response.statusCode.should.equal(200);
        expect(response.body).to.be.jsonSchema(getTemplatesJson);
      });
    });

    it('get letter templates', () => {
      return notifyClient.getAllTemplates('letter').then((response) => {
        response.statusCode.should.equal(200);
        expect(response.body).to.be.jsonSchema(getTemplatesJson);
      });
    });

    it('preview sms template', () => {
      var personalisation = { "name": "Foo" }
      return notifyClient.previewTemplateById(smsTemplateId, personalisation).then((response) => {
        response.statusCode.should.equal(200);
        expect(response.body).to.be.jsonSchema(postTemplatePreviewJson);
        response.body.type.should.equal('sms');
        should.not.exist(response.body.subject);
      });
    });

    it('preview email template', () => {
      var personalisation = { "name": "Foo" }
      return notifyClient.previewTemplateById(emailTemplateId, personalisation).then((response) => {
        response.statusCode.should.equal(200);
        expect(response.body).to.be.jsonSchema(postTemplatePreviewJson);
        response.body.type.should.equal('email');
        should.exist(response.body.subject);
      });
    });

    it('preview letter template', () => {
      var personalisation = { "address_line_1": "Foo", "address_line_2": "Bar", "postcode": "Zing" }
      return notifyClient.previewTemplateById(letterTemplateId, personalisation).then((response) => {
        response.statusCode.should.equal(200);
        expect(response.body).to.be.jsonSchema(postTemplatePreviewJson);
        response.body.type.should.equal('letter');
        should.exist(response.body.subject);
      });
    });

    it('get all received texts', () => {
      chai.tv4.addSchema('receivedText.json', getReceivedTextJson);
      return receivedTextClient.getReceivedTexts().then((response) => {
        response.statusCode.should.equal(200);
        expect(response.body).to.be.jsonSchema(getReceivedTextsJson);
        expect(response.body["received_text_messages"]).to.be.an('array').that.is.not.empty;
      });
    });

  });

});
