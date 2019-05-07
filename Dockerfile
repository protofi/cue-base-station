# base-image for node on any machine using a template variable,
# see more about dockerfile templates here: https://www.balena.io/docs/learn/develop/dockerfile/#dockerfile-templates
# and about balena base images here: https://www.balena.io/docs/reference/base-images/base-images/
FROM balenalib/raspberrypi3-node:8-stretch

ENV DEVICE_UUID_PREFIX c
ENV GOOGLE_IOT_PROJECT staging-cue-iot-cloud
ENV GOOGLE_IOT_REGION europe-west1
ENV GOOGLE_IOT_REGISTRY Base-Station-Registry
ENV GOOGLE_IOT_SERVICE_JSON '{"type": "service_account","project_id": "staging-cue-iot-cloud","private_key_id": "81d39e9ffda1812b845b24e52dc8a624c04e2fe3","private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDWQ1Rv6GHcGd0+\n7/xAg/XPOsCCS2I48Es5tljTf+E0tVOYaGq2amabhyt5HnfhAaAFHCltX95ZYr4T\ncEIGgsPFucyMoRVnVwNJtpO8jM35dwV9i+E7q/6gNqbJez/KfRjDTsfgJsyuNfGN\nwp0MvocgKx4T9XXzqnIP+c6LdNUFyU11nUHy0R+AZ+mKPN/PBjgBrZZq2k2Um1um\nsb1cU/QsrOtkpQzLp4Ti3ChYYl4Njv6MCR+q6IhQk9XEdxOSMFLdOditxuVB+12X\n4XKolRLD10BUSH9EphfZPEaTO95R0/ZQoqAtwt5DcyfGxGUCrvsFUKD7z07evMmY\nG8QcfJexAgMBAAECggEALbqohIrdCfgGMZbQKGfRmGUybYyPvdXBRGO/4QH3y4NQ\nwGQ2tFCQriyC8YJ4dPAfGkAYsmSF5N9vcGAi41dY17QwLSp7EjdutvaN4O3PTykh\nJZqrW0w517FaVwGkS3/3/0Uq4RL+18ahE4+f67alSc8SCBH5FuR/nBvFgpuQlH9u\nb6b7CLj+QM8XmFju+fQE8CiBHOmdk1BibRsqkIE2r5IYujbHqUfbfaQCNA673HLT\nBxWEh+KkWeSg05qTwNqD6UuPd55OlRwxNT/0w2q9RLq+q3wyQZzO/Xtl14nRFhGa\nis9XfnPxTovpB3pzdRvqJVF6+sXd2YIQiuQDhJX77QKBgQDx/NBk4tPaVY+9N6Vm\n4E6O1baZnIaB9OKkZX/KZCvN7WX4vF3S7YofTXRkUI4EVKJR0a/sqoUH0iwZ16Vk\nh3MO++pNlpa9BVSY0bdTKrBYGgX+AxYWnD5vY3QRQzCxQKDZV4kthzyNZkuQlJ0g\nKZBmPJIBahrKF4JXxfQYekEDtQKBgQDiq4gJ4G9GswDVaQjSgHkdSuNB1b18wEcT\nlyHbsdtbt4qf6BWzu6H/RyT0rCrwxxnTvuZ7fDzcfEhSu4J4FfL91Mra+1YFaLRv\nSOLk/Gdw/gRs2i78hrozLXwxSY10Zx8NPmT0DoGZJ2dIEU4432ieaoWKuQH8X3SS\nchuL+ll5jQKBgQDnkF/zSsQkOKBWF3vmGFvUf1o/YPOuRKLlYmOJT5ZDdxuPjOHT\nyI/WKI5quFNOfZbe6OOKfBrVQyAEksGok51dB2BNYv9YXlN38aeWpFEf3bdCPb3T\nYSy19tvI8R0VYZ0KnqOct78QKIXDExPRBTUzQF8Pj3OXVCvcxocxLTwtyQKBgQDM\n/Ns2M2XuxgtG9Iop9E2TlBoZe7a1jx24NcFE8X+zXjVbj4Ow20sRlcFyFBFxVl2h\nBM9jdWOE8lBloXXIK/FoZHxftVSB58LlsUCgXTMfGFngJyC+9wiFJ+lcmWv3jRqj\n231oyYWif+QDZMMc4821FhhW8CE/nwPJPLB00p8AMQKBgHIWm4Wf6D2JuGqHZs6G\nhZPbusYsjyYbmzpfCmRBoi+5GMvnTzBmsrdoa+u90gyCYdfeH56+rF6mpS6rf0Kz\nlmNBV20x96XM5f5t6yjTMEwsLS8JdaI6dn73e2xmF3SrGJVIQNtCuWwcZKPv865I\nuEicolIropni1FWmEOlrAcQQ\n-----END PRIVATE KEY-----\n","client_email": "base-station-account@staging-cue-iot-cloud.iam.gserviceaccount.com","client_id": "107763305334366336240","auth_uri": "https://accounts.google.com/o/oauth2/auth","token_uri": "https://oauth2.googleapis.com/token","auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/base-station-account%40staging-cue-iot-cloud.iam.gserviceaccount.com"}'

RUN install_packages curl

RUN apt-get update && apt-get install -y \
  build-essential -y \
  bluetooth \
  bluez \
  libbluetooth-dev \
  libudev-dev \
  libdbus-1-dev \
  libglib2.0-dev \
  libical-dev \
  libreadline-dev

# Install LTS Node.js
RUN curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install the google cloud SDK
RUN export CLOUD_SDK_REPO="cloud-sdk-stretch" && \
    echo "deb http://packages.cloud.google.com/apt $CLOUD_SDK_REPO main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list && \
    curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add - && \
    apt-get update -y && apt-get install google-cloud-sdk -y

# Defines our working directory in container
WORKDIR /usr/src/app

RUN npm i -g typescript

# Copies the package.json first for better cache on later pushes
COPY package.json package.json
COPY package-lock.json package-lock.json

# This install npm dependencies      on the balena build server,
# making sure to clean up the artifacts it creates in order to reduce the image size.
RUN JOBS=MAX npm install --production --unsafe-perm && npm cache verify && rm -rf /tmp/*

# This will copy all files in our root to the working directory in the container

COPY . ./

RUN tsc -p src

CMD ["bash", "start.sh"]