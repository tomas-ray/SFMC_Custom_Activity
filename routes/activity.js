'use strict';
var util = require('util');

const Path = require('path');
const JWT = require(Path.join(__dirname, '..', 'lib', 'jwtDecoder.js'));
var util = require('util');
var http = require('https');
let axios = require("axios");
var request = require("request");
var jsforce = require('jsforce');
const jsonCircular = require('circular-json');
const fs = require('fs');
var campaignIdValue = '';
var connectionErrorMessage = [];


exports.logExecuteData = [];

function logData(req) {
    exports.logExecuteData.push({
        body: req.body,
        headers: req.headers,
        trailers: req.trailers,
        method: req.method,
        url: req.url,
        params: req.params,
        query: req.query,
        route: req.route,
        cookies: req.cookies,
        ip: req.ip,
        path: req.path,
        host: req.host,
        fresh: req.fresh,
        stale: req.stale,
        protocol: req.protocol,
        secure: req.secure,
        originalUrl: req.originalUrl
    });
}

function writeToFile(output){
    fs.writeFile("./home/appuser/logs/jsLog.txt", output, function(err) {
       if(err) {
           return console.log(err);
       }
        console.log("The file was saved!");
   });  
}

/*
 * POST Handler for / route of Activity (this is the edit route).
 */
exports.edit = function (req, res) {
    logData(req);
    res.send(200, 'Edit');
};

/*
 * POST Handler for /save/ route of Activity.
 */
exports.save = function (req, res) {
    writeToFile('journeybuilder/save');
    console.log('Save');
    res.send(200, 'Save');
};

/*
 * POST Handler for /publish/ route of Activity.
 */
exports.publish = function (req, res) {
    writeToFile('journeybuilder/publish');
    console.log('Publish');
    res.send(200, 'Publish');
};

/*
 * POST Handler for /validate/ route of Activity.
 */
exports.validate = function (req, res) {
    writeToFile('journeybuilder/validate');
    res.send(200, 'Validate');
    console.log("end validate function!!!");
};

/*
 * POST Handler for /Stop/ route of Activity.
 */
exports.stop = function (req, res) {
    writeToFile('journeybuilder/stop');
    res.send(200, 'Stop');
};

/*
 * POST Handler for /execute/ route of Activity.
 */
exports.execute = function (req, res) {
    JWT(req.body, process.env.JWT_KEY, (err, decoded) => {
        let responseBody = '';
        if (err) {
            console.error(err);
            return res.status(401).end();
        }


        if (decoded && decoded.inArguments && decoded.inArguments.length > 0) {
            console.log('##### decoded ####=>', decoded);
            var decodedArgs = decoded.inArguments[0];
            getMcTokenJD(decodedArgs);

            return res.send(200, 'Execute');
        
        } else {
            writeToFile('inArguments invalid.');
            console.error('inArguments invalid.');
            return res.status(400).end();
        }
    });
    console.log("end execute function!!!");
};


function getMcTokenJD(decodedArgs){

    var bodyString = JSON.stringify({
        client_id : process.env.CLIENT_ID,
        client_secret : process.env.CLIENT_SECRET,
        grant_type : "client_credentials"
    });

    var header = {
        'Content-Type': 'application/json',
    };

    var optionRequest = { 
        method: 'POST',
        headers: header,
        url: process.env.AUTHENTICATIONBASE_URI + 'v2/token'
    };

    request(optionRequest, function (error, response, body) {
        var jsonObject = JSON.parse(body);
        var token = jsonObject["access_token"];
        getDataXMLJD(decodedArgs,token);
    }).write(bodyString);
}
function getDataXMLJD(decodedArgs,token){


    var xml = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
        '<soapenv:Header>' + 
        '<fueloauth>' + token + '</fueloauth>' + 
        '</soapenv:Header>' + 
        '<soapenv:Body>' + 
            '<RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">' +
            '<RetrieveRequest>' +
                // '<ObjectType>DataExtensionObject' +'[' + process.env.ACCOUNT_SALESFORCE_DE + ']' + '</ObjectType>' +
                '<ObjectType>DataExtensionObject[Account_STD]</ObjectType>' +
                '<Properties>NBA_Ongoing_Interaction__c</Properties>' +
                '<Filter xsi:type="SimpleFilterPart">' +
                    '<Property>Id</Property>' +
                    '<SimpleOperator>equals</SimpleOperator>' +
                    '<Value>' + decodedArgs.accountId + '</Value>' +
                '</Filter>' +
            '</RetrieveRequest>' +
        '</RetrieveRequestMsg>' +
        '</soapenv:Body>' + 
        '</soapenv:Envelope>'

 
    const url = process.env.soap_Base_Uri + 'Service.asmx';
    const headers = {
    'Content-Type': 'text/xml',
    'soapAction': 'Retrieve'
    };

    axios.post(url,xml,{
    headers: {
    'Content-Type': 'text/xml',
    'soapAction': 'Retrieve'
    }
    }
    ).then(response => {
        const { body, statusCode } = response.data;
        writeToFile('RESPONSE - > ' + response.data);
        console.log('RESPONSE - > ' + response.data);
        var parser = require('fast-xml-parser');
        var he = require('he');
        var options = {
            attributeNamePrefix : "@_",
            attrNodeName: "attr",
            textNodeName : "#text",
            ignoreAttributes : true,
            ignoreNameSpace : false,
            allowBooleanAttributes : false,
            parseNodeValue : true,
            parseAttributeValue : false,
            trimValues: true,
            cdataTagName: "__cdata",
            cdataPositionChar: "\\c",
            localeRange: "",
            parseTrueNumberOnly: false,
            attrValueProcessor: a => he.decode(a, {isAttributeValue: true}),
            tagValueProcessor : a => he.decode(a)
        };

            if(parser.validate(response.data) === true) {

                var jsonObj = parser.parse(response.data,options);

                var soapEnvelope = jsonObj['soap:Envelope'];
                var soapBody = soapEnvelope['soap:Body'];
                var Property = soapBody.RetrieveResponseMsg.Results;
                if(Property == undefined){
                    var isOnGoing = '';
                }
                else{
                    var isOnGoing = soapBody.RetrieveResponseMsg.Results.Properties.Property.Value;   
                }
                requestGetProductInformationJD(isOnGoing,decodedArgs,token);

            }
            else{
                writeToFile('Parser not validated');
                console.log('PARSER NOT VALIDATE');
            }
    }
    ).catch(err => {console.log(err)});
}
function requestGetProductInformationJD(isOnGoing,decodedArgs,token){

    var bodyStringRequest = JSON.stringify({
        decisionId: decodedArgs.decisionId,
        platform : process.env.PLATFORM,
        audienceList : [{
            customerId :  decodedArgs.clientId,
            microSegment : decodedArgs.microSegment,
            isOngoing : isOnGoing
            }
        ],
        campaign : {
            campaignId : decodedArgs.campaignId,
            campaignName : decodedArgs.campaignName,
            campaignType : decodedArgs.campaignType,
            campaignProductType : [
                decodedArgs.campaignProductType
            ],
            overrideContactFramwork : decodedArgs.override
        }
    });

    writeToFile('bodyStringRequest - > ' + bodyStringRequest);
    console.log('bodyStringRequest - > ' + bodyStringRequest);

    var header = {
        'Content-Type': 'application/json',
        'Content-Length': bodyStringRequest.length
    };

    var optionRequest = { 
        method: 'POST',
        headers: header,
        url: process.env.WS_URL
    
    };
    request(optionRequest, function (error, response, body) {
        if(error){
            connectionErrorMessage[0] = error;
            writeToFile('connectionErrorMessage - > ' + error)
            console.log('connectionErrorMessage - > ' + error);
        }
        else if(body){
            var jsonValue = JSON.parse(body);
            if(jsonValue.status == 'PS_FAILED'){
                writeToFile('connectionErrorMessage - > ' + error);
                console.log('connectionErrorMessage - > ' + error);
                connectionErrorMessage[0] = jsonValue.status + '-' + jsonValue.message;
            }
        }
        updateDataExtensionDE(body,token,decodedArgs);

    }).write(bodyStringRequest);
}
function updateDataExtensionDE(body,token,decodedArgs){
    let newProduct1 = '';
    let newProduct2 = '';
    let newProduct1Code = '';
    let newProduct2Code = '';
    let newProduct1Type = '';
    let newProduct2Type ='';
    let koReasonValue = '';
    let koStatusValue = '';
    let statusValue = '';
    let messageValue = '';
    let customerIdValue = '';
    var hasError;


    let channelMismatchValue = '';
    let corporateClientsValue = '';
    let underTrustValue = '';
    let servicedByValue = '';
    let customerStatusValue = '';
    let agentStatusValue = '';
    let controlGroupValue = '';
    let underBankruptcyValue = '';
    let foreignAddressValue = '';
    let foreignMobileNumberValue = '';
    let phladeceasedValue = '';
    let claimStatusValue = '';
    let claimTypeValue = '';
    let subClaimTypeValue = '';
    let failedTotalSumAssuredTestValue = '';
    let exclusionCodeImposedValue = '';
    let extraMoralityValue='';
    let isSubstandardValue='';
    let amlwatchListValue = '';
    let underwritingKOsValue = '';
    let existingProductsKOsValue = '';
    let salesPersonKOsValue = ''; 


    if(connectionErrorMessage.length > 0){
        statusValue = process.env.ERROR;
        for(var i = 0; i < connectionErrorMessage.length; i++){
            if(connectionErrorMessage[i] !== undefined){
                messageValue = connectionErrorMessage[i];
            }
            writeToFile('MESSAGE VALUE - > ' + messageValue);
            console.log('MESSAGE VALUE - > ' + messageValue);
        }
    }
    else if(connectionErrorMessage.length === 0){
        writeToFile('WS API BODY - > ' + body);
        console.log('WS API BODY - > ' + body);
        var jsonValue = JSON.parse(body);
        
        koStatusValue = jsonValue.koStatus;
        statusValue = jsonValue.status;
        messageValue = jsonValue.message;
        channelMismatchValue = jsonValue.koReason.channelMismatch
        corporateClientsValue = jsonValue.koReason.corporateClients
        underTrustValue = jsonValue.koReason.underTrust
        servicedByValue = jsonValue.koReason.servicedBy
        customerStatusValue = jsonValue.koReason.customerStatus
        agentStatusValue = jsonValue.koReason.agentStatus
        controlGroupValue = jsonValue.koReason.controlGroup
        underBankruptcyValue = jsonValue.koReason.underBankruptcy
        foreignAddressValue = jsonValue.koReason.foreignAddress
        foreignMobileNumberValue = jsonValue.koReason.foreignMobileNumber
        phladeceasedValue = jsonValue.koReason.phladeceased
        claimStatusValue = jsonValue.koReason.claimStatus
        claimTypeValue = jsonValue.koReason.claimType
        subClaimTypeValue = jsonValue.koReason.subClaimType
        failedTotalSumAssuredTestValue = jsonValue.koReason.failedTotalSumAssuredTest
        exclusionCodeImposedValue = jsonValue.koReason.exclusionCodeImposed
        extraMoralityValue = jsonValue.koReason.extraMorality
        isSubstandardValue = jsonValue.koReason.isSubstandard
        amlwatchListValue = jsonValue.koReason.amlwatchList
        underwritingKOsValue = jsonValue.koReason.underwritingKOs
        existingProductsKOsValue = jsonValue.koReason.existingProductsKOs
        salesPersonKOsValue = jsonValue.koReason.salesPersonKOs

        if(jsonValue.offerProducts.length === 0 && jsonValue.koStatus == process.env.KO_STATUS_NO){
            koStatusValue = process.env.KO_STATUS_YES;
        }
        else if(jsonValue.koStatus == process.env.KO_STATUS_YES && jsonValue.offerProducts.length !== 0){
            koStatusValue = process.env.KO_STATUS_NO;
        }
    
        if(koStatusValue == process.env.KO_STATUS_NO && jsonValue.offerProducts.length !== 0){
            var offerProductsSorted = jsonValue.offerProducts.slice(0);
            offerProductsSorted.sort(function(a,b) {
                return a.productRank - b.productRank;
            });
            for(var i = 0; i < offerProductsSorted.length; i++){
                if(i === 0){    
                    newProduct1 = offerProductsSorted[i].productName;
                    newProduct1Code = offerProductsSorted[i].productCode;
                    newProduct1Type = offerProductsSorted[i].componentCode;
                }
                else if (i = 1){
                    newProduct2 = offerProductsSorted[i].productName;
                    newProduct2Code = offerProductsSorted[i].productCode;
                    newProduct2Type = offerProductsSorted[i].componentCode;
                }
            }
        }
    }

    var bodyStringInsertRowDE = JSON.stringify([
            {
            keys : {
                PK : decodedArgs.decisionId + '-' + decodedArgs.journeyStepCode,
                CampaignAudienceId : decodedArgs.decisionId
            },
            values : {
                customerId : decodedArgs.clientId,
                PersonContactId : decodedArgs.contactId,
                CampaignId : decodedArgs.campaignId,
                journeyStepCode : decodedArgs.journeyStepCode,
                Product1Name : newProduct1,
                Product2Name : newProduct2,
                Product1Code : newProduct1Code,
                Product1ComponentCode : newProduct1Type,
                Product2Code : newProduct2Code,
                Product2ComponentCode : newProduct2Type,
                koStatus : koStatusValue,
                Status : statusValue,
                Message : messageValue,
                PersonContactId : decodedArgs.contactId,
                channelMismatch : channelMismatchValue,
                corporateClients : corporateClientsValue,
                underTrust : underTrustValue,
                servicedBy : servicedByValue,
                customerStatus : customerStatusValue,
                agentStatus : agentStatusValue,
                controlGroup : controlGroupValue,
                underBankruptcy : underBankruptcyValue,
                foreignAddress : foreignAddressValue,
                foreignMobileNumber : foreignMobileNumberValue,
                phladeceased : phladeceasedValue,
                claimStatus : claimStatusValue,
                claimType : claimTypeValue,
                subClaimType : subClaimTypeValue,
                failedTotalSumAssuredTest : failedTotalSumAssuredTestValue,
                exclusionCodeImposed : exclusionCodeImposedValue,
                extraMorality : extraMoralityValue,
                isSubstandard : isSubstandardValue,
                amlwatchList : amlwatchListValue,
                underwritingKOs : underwritingKOsValue,
                existingProductsKOs : existingProductsKOsValue,
                salesPersonKOs : salesPersonKOsValue
            }
        }
    ]);
    writeToFile('bodyStringInsertRowDE -> ' + bodyStringInsertRowDE);
    console.log('bodyStringInsertRowDE -> ' + bodyStringInsertRowDE);
    
    var headerInsertDE = {
        'Content-Type': 'application/json',
        'Authorization' : 'Bearer ' + token
    };
    var optionRequestInsertDE = { 
        method: 'POST',
        headers: headerInsertDE,
        url: process.env.rest_Base_Uri + 'hub/v1/dataevents/key:' + process.env.DATA_EXTENSTION_KEY + '/rowset'
    };

    request(optionRequestInsertDE, function (error, response, body) {
        writeToFile('INSERTED ROW IN DE' + body);
        console.log('INSERTED ROW IN DE' + body);
    }).write(bodyStringInsertRowDE);
}

