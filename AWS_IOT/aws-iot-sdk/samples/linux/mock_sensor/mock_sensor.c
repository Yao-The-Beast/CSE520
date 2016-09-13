#include <stdio.h>
#include <stdlib.h>
#include <ctype.h>
#include <unistd.h>
#include <string.h>
#include <limits.h>

#include "aws_iot_config.h"
#include "aws_iot_log.h"
#include "aws_iot_version.h"
#include "aws_iot_mqtt_client_interface.h"
#include "aws_iot_shadow_interface.h"

//initialize variables
char certDirectory[PATH_MAX+1] = "../../../certs";
char HostAddress[PATH_MAX+1] = AWS_IOT_MQTT_HOST;
int port = AWS_IOT_MQTT_PORT;


void parseInput(int argc, char** argv) {
    int opt = 0;

    while (-1 != (opt = getopt(argc, argv, "c"))) {
        switch(opt) {
            case 'c':
                strcpy(certDirectory, optarg);
                break;
            default:
                IOT_ERROR("Error in command line argument");
                break;  
        }
    }
    return;
}

//handlers
void disconnectCallbackHandler(AWS_IoT_Client *pClient,void *data) { 
    IOT_WARN("MQTT DISCONNECT");
    IoT_Error_t rc = FAILURE;
    
    if (pClient == NULL)
        return;
    
    if(aws_iot_is_autoreconnect_enabled(pClient)) {
		IOT_INFO("Auto Reconnect is enabled, Reconnecting attempt will start now");
	} else {
		IOT_WARN("Auto Reconnect not enabled. Starting manual reconnect...");
		rc = aws_iot_mqtt_attempt_reconnect(pClient);
		if(NETWORK_RECONNECTED == rc) {
			IOT_WARN("Manual Reconnect Successful");
		} else {
			IOT_WARN("Manual Reconnect Failed - %d", rc);
		}
	}

}

int main(int argc, char** argv) {

    char rootCA[PATH_MAX+1];
    char clientCRT[PATH_MAX+1];
    char clientKey[PATH_MAX+1];
    char currentWD[PATH_MAX+1];
    char cPayload[PATH_MAX+1];

    IoT_Error_t rc = FAILURE;

    AWS_IoT_Client client;
    IoT_Client_Connect_Params connectParams = iotClientConnectParamsDefault;
    IoT_Client_Init_Params mqttInitParams = iotClientInitParamsDefault;

    parseInput(argc, argv);
    //get current directory
    getcwd(currentWD, sizeof(currentWD));
    snprintf(rootCA, PATH_MAX + 1, "%s/%s/%s", currentWD, certDirectory, AWS_IOT_ROOT_CA_FILENAME);
	snprintf(clientCRT, PATH_MAX + 1, "%s/%s/%s", currentWD, certDirectory, AWS_IOT_CERTIFICATE_FILENAME);
	snprintf(clientKey, PATH_MAX + 1, "%s/%s/%s", currentWD, certDirectory, AWS_IOT_PRIVATE_KEY_FILENAME);

    //IOT_DEBUG("rootCA %s", rootCA);
	//IOT_DEBUG("clientCRT %s", clientCRT);
	//IOT_DEBUG("clientKey %s", clientKey);

    //initialization params
	mqttInitParams.enableAutoReconnect = false;
	mqttInitParams.pHostURL = HostAddress;
	mqttInitParams.port = port;
	mqttInitParams.pRootCALocation = rootCA;
	mqttInitParams.pDeviceCertLocation = clientCRT;
	mqttInitParams.pDevicePrivateKeyLocation = clientKey;
	mqttInitParams.mqttCommandTimeout_ms = 20000;
	mqttInitParams.tlsHandshakeTimeout_ms = 5000;
	mqttInitParams.isSSLHostnameVerify = true;
	mqttInitParams.disconnectHandler = disconnectCallbackHandler;
	mqttInitParams.disconnectHandlerData = NULL;

    //initialize the client
    rc = aws_iot_mqtt_init(&client,&mqttInitParams);
    if(SUCCESS != rc) {
		IOT_ERROR("aws_iot_mqtt_init returned error : %d ", rc);
		return rc;
	}

    //connection params
    connectParams.keepAliveIntervalInSec = 10;
	connectParams.isCleanSession = true;
	connectParams.MQTTVersion = MQTT_3_1_1;
    connectParams.pClientID = AWS_IOT_MQTT_CLIENT_ID;
    connectParams.clientIDLen = (uint16_t) strlen(AWS_IOT_MQTT_CLIENT_ID);
    connectParams.isWillMsgPresent = false;
    //connect to the device
    rc = aws_iot_mqtt_connect(&client, &connectParams);
    if(SUCCESS != rc) {
		IOT_ERROR("Error(%d) connecting to %s:%d", rc, mqttInitParams.pHostURL, mqttInitParams.port);
		return rc;
	}

    //initialize published message
    IoT_Publish_Message_Params messageParams;
    messageParams.qos = QOS0;
    messageParams.payload = (void *) cPayload;
    messageParams.isRetained = 0;

    //intialize publishing
    int publishCount = 10;

    while (publishCount >= 0) {
        if (NETWORK_ATTEMPTING_RECONNECT == rc || NETWORK_RECONNECTED == rc || SUCCESS == rc) {
            
            //yield the thread and let it handles pings and receiving msgs
            rc = aws_iot_mqtt_yield(&client, 100);
            if (NETWORK_ATTEMPTING_RECONNECT == rc)
                continue;
            
            //format message
            char topicName[] = "Temperature";
            sprintf(cPayload, "%s:%d","temperature",publishCount);
            messageParams.payloadLen = strlen(cPayload);

            //publish the message
            rc = aws_iot_mqtt_publish(&client, topicName, strlen(topicName), &messageParams);
            if (MQTT_REQUEST_TIMEOUT_ERROR == rc){
                IOT_ERROR("Error: mqtt request timeout error");
                break;
            }
        }else {
            break;
        }
        publishCount--;
    }

    if (SUCCESS != rc) {
        IOT_ERROR("Error: something has happened in the loop. \n");
    } else {
        IOT_INFO("Publish done \n");
    }
    return rc;
}