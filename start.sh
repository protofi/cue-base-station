#!/bin/bash

if [ ! -f /data/service.json ]; then

	# Make sure all the required environment variables are set
	if [ -z "$GOOGLE_IOT_SERVICE_JSON" ]; then
		echo "Missing GOOGLE_IOT_SERVICE_JSON environment variable, login to https://dashboard.resin.io/ to create it"
		exit
	elif [ -z "$RESIN_DEVICE_UUID" ]; then
		echo "No device name supplied, are you running this in ResinOS?"
		exit
	elif [ -z "$GOOGLE_IOT_PROJECT" ]; then
		echo "Missing GOOGLE_IOT_PROJECT environment variable, login to https://dashboard.resin.io/ to set it"
		exit
	elif [ -z "$GOOGLE_IOT_REGION" ]; then
		echo "Missing GOOGLE_IOT_REGION environment variable, login to https://dashboard.resin.io/ to set it"
		exit
	elif [ -z "$GOOGLE_IOT_REGISTRY" ]; then
		echo "Missing GOOGLE_IOT_REGISTRY environment variable, login to https://dashboard.resin.io/ to set it"
		exit
	fi

    # Create service credentials file and configure gcloud
    echo "Authenticating service account"

    echo "$GOOGLE_IOT_SERVICE_JSON" > /data/service.json
    echo -n "$GOOGLE_IOT_SERVICE_JSON_TWO" >> /data/service.json
    echo -n "$GOOGLE_IOT_SERVICE_JSON_THREE" >> /data/service.json

    gcloud config set disable_prompts true
    gcloud auth activate-service-account --key-file=/data/service.json
    gcloud config set project $GOOGLE_IOT_PROJECT
    gcloud config set compute/zone $GOOGLE_IOT_REGION

	# Create keys and register device with the configured Google IoT registry
	echo "Creating device keys and registering device"

	# Create the keys in the persistent storage space mounted on /data
    cd /data

    # Create keys
    openssl req -x509 -newkey rsa:2048 -keyout rsa-priv.pem -nodes -out rsa-cert.pem -subj "//CN=unused"
    openssl ecparam -genkey -name prime256v1 -noout -out rsa-ec_private.pem
    openssl ec -in rsa-ec_private.pem -pubout -out rsa-ec_public.pem

    # Create Base Station record in Firestore 
    gcloud pubsub topics publish base-station-initialize --attribute deviceId=$DEVICE_UUID_PREFIX$RESIN_DEVICE_UUID

    # Register as Google IoT device with the keys created above
    gcloud iot devices create $DEVICE_UUID_PREFIX$RESIN_DEVICE_UUID \
            --project=$GOOGLE_IOT_PROJECT \
            --region=$GOOGLE_IOT_REGION \
            --registry=$GOOGLE_IOT_REGISTRY \
            --public-key path=/data/rsa-cert.pem,type=rs256

    cd -

elif [ -f /data/service.json ]; then
    echo "CERTIFICATE EXISTS"
fi

# Create link to persistent file storage
ln -s /data ./data


# hello

node dist/main.js