#include <string>
#include <stdio.h>
#include <stdlib.h>
#include <ctype.h>
#include <unistd.h>
#include <limits.h>
#include <string.h>
#include <ctime>
#include <iostream>

#include "aws_iot_config.h"
#include "aws_iot_log.h"
#include "aws_iot_version.h"
#include "aws_iot_mqtt_client_interface.h"
#include "sensor.h"

extern int humidity;
extern int temperature;
extern int light;

char certDirectory[PATH_MAX + 1] = "../../../certs";
char HostAddress[255] = AWS_IOT_MQTT_HOST;
uint32_t port = AWS_IOT_MQTT_PORT;
uint32_t publishCount = 0;

std::string getCurrentTime(){
    struct timeval tp;
	gettimeofday(&tp, NULL);
	long int ms = tp.tv_sec * 1000 + tp.tv_usec / 1000;
	return std::to_string(ms);
}

void iot_subscribe_callback_handler(AWS_IoT_Client *pClient, char *topicName, uint16_t topicNameLen,
									IoT_Publish_Message_Params *params, void *pData) {
	IOT_UNUSED(pData);
	IOT_UNUSED(pClient);
	// IOT_INFO("Subscribe callback");
	//IOT_INFO("%.*s\t%.*s", topicNameLen, topicName, (int) params->payloadLen, params->payload);
	std::string currentTime = getCurrentTime();
	char* payload = (char*) params->payload;
	int payloadLen = (int)params->payloadLen;
	std::string data(payload,payloadLen);
	std::string topic(topicName,topicNameLen);
	
	if (topic.compare("latencyTest") == 0){
		long int sentTime = std::stol(data,nullptr,10);
		long int currentTime = std::stol(getCurrentTime(),nullptr,10);
		long int latency = currentTime - sentTime;
		std::cout << latency << std::endl;
		std::cout << "Topic:" << topic << ";Data: " << data << std::endl;
	}else if (topic.compare("sensorData") == 0){
		std::cout << "Topic:" << topic << ";Data: " << data << std::endl;
	}else if (topic.compare("ledData") == 0){
		std::cout << "Topic:" << topic << ";Data: " << data << std::endl;
	}else{

	}
	
}

void disconnectCallbackHandler(AWS_IoT_Client *pClient, void *data) {
	IOT_WARN("MQTT Disconnect");
	IoT_Error_t rc = FAILURE;

	if(NULL == pClient) {
		return;
	}

	IOT_UNUSED(data);

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

void parseInputArgsForConnectParams(int argc, char **argv) {
	int opt;

	while(-1 != (opt = getopt(argc, argv, "h:p:c:x:"))) {
		switch(opt) {
			case 'h':
				strcpy(HostAddress, optarg);
				//IOT_DEBUG("Host %s", optarg);
				break;
			case 'p':
				port = atoi(optarg);
				//IOT_DEBUG("arg %s", optarg);
				break;
			case 'c':
				strcpy(certDirectory, optarg);
				//IOT_DEBUG("cert root directory %s", optarg);
				break;
			case 'x':
				publishCount = atoi(optarg);
				//IOT_DEBUG("publish %s times\n", optarg);
				break;
			case '?':
				if(optopt == 'c') {
					IOT_ERROR("Option -%c requires an argument.", optopt);
				} else if(isprint(optopt)) {
					IOT_WARN("Unknown option `-%c'.", optopt);
				} else {
					IOT_WARN("Unknown option character `\\x%x'.", optopt);
				}
				break;
			default:
				IOT_ERROR("Error in command line argument parsing");
				break;
		}
	}
}



int main(int argc, char **argv) {
	bool infinitePublishFlag = true;

	char rootCA[PATH_MAX + 1];
	char clientCRT[PATH_MAX + 1];
	char clientKey[PATH_MAX + 1];
	char CurrentWD[PATH_MAX + 1];
	char cPayload[100];

	int32_t i = 0;

	IoT_Error_t rc = FAILURE;

	AWS_IoT_Client client;
	IoT_Client_Init_Params mqttInitParams = iotClientInitParamsDefault;
	IoT_Client_Connect_Params connectParams = iotClientConnectParamsDefault;

	IoT_Publish_Message_Params paramsQOS0;
	IoT_Publish_Message_Params paramsQOS1;

	parseInputArgsForConnectParams(argc, argv);


	IOT_INFO("\nAWS IoT SDK Version %d.%d.%d-%s\n", VERSION_MAJOR, VERSION_MINOR, VERSION_PATCH, VERSION_TAG);

	getcwd(CurrentWD, sizeof(CurrentWD));
	snprintf(rootCA, PATH_MAX + 1, "%s/%s/%s", CurrentWD, certDirectory, AWS_IOT_ROOT_CA_FILENAME);
	snprintf(clientCRT, PATH_MAX + 1, "%s/%s/%s", CurrentWD, certDirectory, AWS_IOT_CERTIFICATE_FILENAME);
	snprintf(clientKey, PATH_MAX + 1, "%s/%s/%s", CurrentWD, certDirectory, AWS_IOT_PRIVATE_KEY_FILENAME);

	//configure initial params
	mqttInitParams.enableAutoReconnect = false; // We enable this later below
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

	rc = aws_iot_mqtt_init(&client, &mqttInitParams);
	if(SUCCESS != rc) {
		IOT_ERROR("aws_iot_mqtt_init returned error : %d ", rc);
		return rc;
	}
	//config connectParams after the initialization
	connectParams.keepAliveIntervalInSec = 10;
	connectParams.isCleanSession = true;
	connectParams.MQTTVersion = MQTT_3_1_1;
	connectParams.pClientID = (char *)AWS_IOT_MQTT_CLIENT_ID;
	connectParams.clientIDLen = (uint16_t) strlen(AWS_IOT_MQTT_CLIENT_ID);
	connectParams.isWillMsgPresent = false;

	IOT_INFO("Connecting...");
	rc = aws_iot_mqtt_connect(&client, &connectParams);
	if(SUCCESS != rc) {
		IOT_ERROR("Error(%d) connecting to %s:%d", rc, mqttInitParams.pHostURL, mqttInitParams.port);
		return rc;
	}
	/*
	 * Enable Auto Reconnect functionality. Minimum and Maximum time of Exponential backoff are set in aws_iot_config.h
	 *  #AWS_IOT_MQTT_MIN_RECONNECT_WAIT_INTERVAL
	 *  #AWS_IOT_MQTT_MAX_RECONNECT_WAIT_INTERVAL
	 */
	rc = aws_iot_mqtt_autoreconnect_set_status(&client, true);
	if(SUCCESS != rc) {
		IOT_ERROR("Unable to set Auto Reconnect to true - %d", rc);
		return rc;
	}

	IOT_INFO("Subscribing...");
	rc = aws_iot_mqtt_subscribe(&client, "ledData",7, QOS0, iot_subscribe_callback_handler, NULL);
	//rc = aws_iot_mqtt_subscribe(&client, "sensorData",10, QOS0, iot_subscribe_callback_handler, NULL);
	//rc = aws_iot_mqtt_subscribe(&client, "latencyTest",11, QOS0, iot_subscribe_callback_handler, NULL);
	if(SUCCESS != rc) {
		IOT_ERROR("Error subscribing : %d ", rc);
		return rc;
	}
    

	//publishCount = 0;
	//infinitePublishFlag = false;
	while((NETWORK_ATTEMPTING_RECONNECT == rc || NETWORK_RECONNECTED == rc || SUCCESS == rc)
		  && (publishCount > 0 || infinitePublishFlag)) {

		//Max time the yield function will wait for read messages
		//wait for messages or ping the serve to claim healthy
		rc = aws_iot_mqtt_yield(&client, 200);
		
		if(NETWORK_ATTEMPTING_RECONNECT == rc) {
			// If the client is attempting to reconnect we will skip the rest of the loop.
			continue;
		}

		do {
			//yao
		    //set payload

		    // std::string sensorData = getCurrentTime();

			/***** call the sensor function to get data *****/
			std::string sensorData = get_data();

		    strcpy(cPayload,sensorData.c_str());
			paramsQOS1.qos = QOS1;
			paramsQOS1.payload = (void *) cPayload;
			paramsQOS1.isRetained = 0;
			paramsQOS1.payloadLen = strlen(cPayload);
			rc = aws_iot_mqtt_publish(&client, "sensorData", 10, &paramsQOS1);
			sleep(2);
		} while(MQTT_REQUEST_TIMEOUT_ERROR == rc && (publishCount > 0 || infinitePublishFlag));
	}

	if(SUCCESS != rc) {
		IOT_ERROR("An error occurred in the loop.\n");
	} else {
		IOT_INFO("Publish done\n");
	}

	return rc;
}



////////////////////////////////////////////////////////////

int fd;
int on_off=0;
int lock=0;
int humidity = 0;
int temperature = 0;
int light = 0;
int valid_length=0;
int result = 0;

int set_opt(int fd,int nSpeed, int nBits, char nEvent, int nStop){
    struct termios newtio,oldtio;
    if  ( tcgetattr( fd,&oldtio)  !=  0) { 
        perror("SetupSerial 1");
        return -1;
    }
    bzero( &newtio, sizeof( newtio ) );
    newtio.c_cflag  |=  CLOCAL | CREAD; 
    newtio.c_cflag &= ~CSIZE; 

    switch( nBits )
    {
    case 7:
        newtio.c_cflag |= CS7;
        break;
    case 8:
        newtio.c_cflag |= CS8;
        break;
    }

    switch( nEvent ){
    case 'O':                     
        newtio.c_cflag |= PARENB;
        newtio.c_cflag |= PARODD;
        newtio.c_iflag |= (INPCK | ISTRIP);
        break;
    case 'E':                     
        newtio.c_iflag |= (INPCK | ISTRIP);
        newtio.c_cflag |= PARENB;
        newtio.c_cflag &= ~PARODD;
        break;
    case 'N':                   
        newtio.c_cflag &= ~PARENB;
        break;
    }

switch( nSpeed ){
    case 2400:
        cfsetispeed(&newtio, B2400);
        cfsetospeed(&newtio, B2400);
        break;
    case 4800:
        cfsetispeed(&newtio, B4800);
        cfsetospeed(&newtio, B4800);
        break;
    case 9600:
        cfsetispeed(&newtio, B9600);
        cfsetospeed(&newtio, B9600);
        break;
    case 115200:
        cfsetispeed(&newtio, B115200);
        cfsetospeed(&newtio, B115200);
        break;
    default:
        cfsetispeed(&newtio, B9600);
        cfsetospeed(&newtio, B9600);
        break;
    }
    if( nStop == 1 ){
        newtio.c_cflag &=  ~CSTOPB;
    }
    else if ( nStop == 2 ){
        newtio.c_cflag |=  CSTOPB;
    }
    newtio.c_cc[VTIME]  = 1;
    newtio.c_cc[VMIN] = 1;
    tcflush(fd,TCIFLUSH);
    if((tcsetattr(fd,TCSANOW,&newtio))!=0){
        perror("com set error");
        return -1;
    }
    printf("set done!\n");
    return 0;
}

int open_port(int fd,int comport){
  
    if (comport==1)
    {    fd = open( "/dev/ttyUSB0", O_RDWR|O_NOCTTY|O_NDELAY);
        if (-1 == fd)
        {
            perror("Can't Open Serial Port");
            return(-1);
        }
        else 
        {
            printf("open ttyUSB0 .....\n");
        }
    }
    else if(comport==2)
    {    fd = open( "/dev/ttyUSB1", O_RDWR|O_NOCTTY|O_NDELAY);
        if (-1 == fd)
        {
            perror("Can't Open Serial Port");
            return(-1);
        }
        else 
        {
            printf("open ttyUSB1 .....\n");
        }    
    }
    else if (comport==3)
    {
        fd = open( "/dev/ttyUSB2", O_RDWR|O_NOCTTY|O_NDELAY);
        if (-1 == fd)
        {
            perror("Can't Open Serial Port");
            return(-1);
        }
        else 
        {
            printf("open ttyUSB2 .....\n");
        }
    }
    if(fcntl(fd, F_SETFL, 0)<0)
    {
        printf("fcntl failed!\n");
    }
    else
    {
        printf("fcntl=%d\n",fcntl(fd, F_SETFL,0));
    }
    if(isatty(STDIN_FILENO)==0)
    {
        printf("standard input is not a terminal device\n");
    }
    else
    {
        printf("isatty success!\n");
    }
    printf("fd-open=%d\n",fd);
    
    return fd;
}

void uart_init(void){
	
    int i;
    fd = open_port(fd,1);
    
    if(fd<0)
    {
        perror("open_port error");
       // return -1;
    }
    
    i=set_opt(fd,115200,8,'N',1);
   
    if(i<0)
    {
        perror("set_opt error");
        //return -1;
    }
    
    
}

std::string get_data(void){
	send_onedata('D');
	usleep(10000);
	int nread,i; 
    std::string outputString = "";
	unsigned char buff_read[11];
    unsigned char buff_read1[22];
    
    
    nread=read(fd,buff_read,sizeof(buff_read));
   // printf("nread=%d,%s\n",nread,buff);
    //close(fd);
    if(nread>0)
    {          memcpy(buff_read1 + valid_length, buff_read, nread);
               valid_length = valid_length + nread;
               while (valid_length >= 11)
               {
                   for (i = 0; (buff_read1[i] != 0x10) && (i < valid_length); i++);
                   if (i == valid_length)
                   {
				       valid_length = 0;
				       break;
			       }
			       else
			       {
                       if (i > 0)
                       {
					       valid_length = valid_length - i;
				           memmove(buff_read1, buff_read1 + i, valid_length);
			           }
			           
			           if (valid_length >= 11)
			           {
					       if ((buff_read1[2] != ':') || (buff_read1[10] != '\0'))
					       {
					           valid_length--;
				               memmove(buff_read1, buff_read1 + 1, valid_length);
				               continue;
						   }
						   else
						   {
							   
							   
							   switch (buff_read1[1])
							   {
								   case 'd':
								   {
									   temperature= buff_read1[4] | (buff_read1[5] <<8);
									   humidity = buff_read1[3];
									   light = buff_read1[6] | (buff_read1[7] << 8) | (buff_read1[8] << 16 ) | (buff_read1[9] << 24);
										// printf("humidity   : %d\n", humidity);
										// printf("temperature   : %.1f\n", temperature*0.1);
									    // printf("light   : %.1f\n", light*0.0083);	
                                        outputString += "humidity:"+std::to_string(humidity);
                                        outputString += "temperature:"+std::to_string(temperature);
                                        outputString += "light:"+std::to_string(light);
                                        return outputString;
									   //break;
								   }
								  
								   default:
								   {
								       valid_length--;
				                       memmove(buff_read1, buff_read1 + 1, valid_length);
				                       continue;
								   }
							   }
							   valid_length = valid_length - 8;
							   if (valid_length != 0)
							   {
				                   memmove(buff_read1, buff_read1 + 8, valid_length);
						       }
						   }
				       }
		           }
		       }
		   }
           return outputString;
}

void uart_write(unsigned char* buff)
{
       write(fd,buff,sizeof(buff));
      // printf("write size: %d\n",sizeof(buff));
}

void send_onedata(int value)
{
	
	unsigned char buff[1];
	buff[0]=value;
	uart_write(buff);
}

void alarm(int variable, int value)
{
	
	
	   if(variable>value)
		{
			if(on_off == 0 && lock ==1)
			{
				lock=0;
		    }
			on_off=1;
			lock++;
			if(lock>=2)
			{
				lock=2;
			}
			
		}
		if(variable<=value)
		{
			if(on_off==1 && lock==1)
			{
				lock=2;
			}
			on_off=0;
			lock --;
			if(lock<=0)
			{
				lock=0;
			}
			
	    }
		if(on_off==1 && lock == 1)
		{
			send_onedata('O');
		}
		if(on_off == 0 && lock == 1)
		{
			
			send_onedata('S');
		}
	
}
