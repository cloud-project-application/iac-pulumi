const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const gcp = require("@pulumi/gcp");


const config = new pulumi.Config();
const availabilityZoneCount = config.getNumber("availabilityZoneCount");
const vpcCidrBlock = config.require("vpcCidrBlock");
const cidrBlock = config.require("cidrBlock");
const subnetSuffix = config.require("subnetSuffix");
const state = config.require("state");
const vpcName = config.require("vpcName");
const igwName = config.require("igwName");
const publicSt = config.require("public");
const privateSt = config.require("private");
const public_Subnet = config.require("publicsubnet");
const private_Subnet = config.require("privatesubnet");
const public_rt = config.require("public-rt");
const private_rt = config.require("private-rt");
const public_Route = config.require("publicRoute");
const destinationCidr = config.require("destinationCidr");
const public_route_association = config.require("public-route-association");
const private_route_association = config.require("private-route-association");
const applicationSecurityGroupName = config.require("securityGroupName"); 
const ec2InstanceName = config.require("ec2InstName"); 
const protocolType = config.require("protocoltcp");
const insType = config.require("insType");
const ami_ID = config.require("amiId");
const volType = config.require("volumeType");
const keypairName= config.require("keypairName");
const rdsParameterGroupName= config.require("rdsParameterGroup");
const dbVersion= config.require("dbVersion");
const dbSecurityGroupName= config.require("dbSecurityGroup");
const rdsSubnetGroupName= config.require("rdsSubnetGroupName");
const des= config.require("des");
const finalName= config.require("finalName");
const gp= config.require("gp");
const db= config.require("db");
const instClass= config.require("instClass");
const pass= config.require("pass");
const instName= config.require("instName");
const awsRoute53 = require("@pulumi/aws/route53");
const awsIAM = require("@pulumi/aws/iam");

const publicSubnets = [];
const privateSubnets = [];

// Define a function to get the first N availability zones
function getFirstNAvailabilityZones(data, n) {
    const availableAZCount = data.names.length;

    if (availableAZCount >= n) {
        return data.names.slice(0, n);
    } 
    else {
        // const availabilityZones = [];

        // for (let i = 0; i < n; i++) {
        //     const az = data.names[i % availableAZCount];
        //     availabilityZones.push(az);
        // }

        return data.names;
    }
}

const availabilityZoneNames = []; // Initialize an array to store availability zone names

aws.getAvailabilityZones({ state: `${state}` }).then(data => {

    const snsTopic = new aws.sns.Topic("mySnsTopic-uq-ns", {
        displayName: "My SNS Topic",
    });

    const gcsBucket = new gcp.storage.Bucket("mygcsbucketuqns", {
        // name: "my-gcs-bucket",
        location: "US",
    });

    const gcpServiceAccount = new gcp.serviceaccount.Account("myGcpServiceAccount-uq-ns", {
        accountId: "my-service-account-ns",
        displayName: "My Service Account",
    });
    const gcpServiceAccountKeys = new gcp.serviceaccount.Key("myGcpServiceAccountKey-uq-ns", {
        serviceAccountId: gcpServiceAccount.name,
    });

    const serviceAccountEmail = gcpServiceAccount.email.apply(email => email);

    // Grant permissions to the Service Account for the bucket
    const bucketIAMBinding = new gcp.storage.BucketIAMBinding("bucketIamBinding", {
        bucket: gcsBucket.name,
        role: "roles/storage.objectAdmin", // Role granting storage.objects.create permission
        members: [gcpServiceAccount.email.apply(email => `serviceAccount:${email}`)],
    });

    const dynamoDBTable = new aws.dynamodb.Table("my-dynamodb-table-uq-ns", {
        name: "my-dynamodb-table-uq-ns",
        attributes: [{
            name: "id",
            type: "S",
        }],
        hashKey: "id",
        readCapacity: 5,
        writeCapacity: 5,
    });

    const lambdaRole = new aws.iam.Role("myLambdaRole", {
        // ... (existing IAM Role properties)
    
        // Attach policies needed for Lambda Function
        assumeRolePolicy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [{
                Action: "sts:AssumeRole",
                Effect: "Allow",
                Principal:{
                    Service: "lambda.amazonaws.com",
                }
            }], 
        }),
    });

    // const lambdaRolePolicy = new aws.iam.RolePolicy("lambdaRolePolicy", {
    //     role: lambdaRole.id,
    //     policy: {
    //       Version: "2012-10-17",
    //       Statement: [
    //         {
    //           Effect: "Allow",
    //           Action: [
    //             "logs:CreateLogGroup",
    //             "logs:CreateLogStream",
    //             "logs:PutLogEvents",
    //             "logs:DescribeLogStreams",
    //             "cloudwatch:PutMetricData",
    //             "cloudwatch:GetMetricData",
    //             "cloudwatch:GetMetricStatistics",
    //             "cloudwatch:ListMetrics",
    //             "ec2:DescribeTags",
    //             "sns:Publish",
    //             "lambda:InvokeFunction",
    //             "lambda:GetFunction",
    //             "s3:GetObject", // Add this for accessing objects in S3 (assuming releases are stored there)
    //             "s3:ListBucket", // Add this for listing buckets in S3
    //             "dynamodb:PutItem",
    //           ],
    //           Resource: "*",
    //         },
    //       ],
    //     },
    //   });

    // Attach the AWSLambdaBasicExecutionRole policy to the Lambda role
    const executionRolePolicyAttachment = new aws.iam.RolePolicyAttachment("executionRolePolicyAttachment", {
        role: lambdaRole,
        policyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    });

    const dynamoDBFullAccessPolicyAttachment = new aws.iam.RolePolicyAttachment("dynamoDBFullAccessPolicyAttachment", {
        role: lambdaRole,
        policyArn: "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess",
    });

    // const nodeModulesLayer = new aws.lambda.LayerVersion("nodeModulesLayer", {
    //         layerName: "myNodeModulesLayer",
    //         code: new pulumi.asset.AssetArchive({
    //             "nodejs": new pulumi.asset.FileArchive("../serverless-fork/node_modules")
    //     }),
    //     compatibleRuntimes: ["nodejs18.x"],
    // });
    // const lambdaRolePolicyAttachment = new aws.iam.RolePolicyAttachment("myLambdaRolePolicyAttachment", {
    //     policyArn: lambdaRolePolicy.arn,
    //     role: lambdaRole,
    // });

    const lambdaFunction = new aws.lambda.Function("myLambdaFunction", {
        runtime: aws.lambda.Runtime.NodeJS18dX, // Adjust the runtime as needed
        // layers: [nodeModulesLayer.arn],
        handler: "index.handler",
        code: new pulumi.asset.FileArchive("../serverless"),
        environment: {
            variables: {
                GCP_SERVICE_ACCOUNT_PRIVATE_KEY: gcpServiceAccountKeys.privateKey, // Use the service account key
                GCP_PROJECT:'tranquil-app-406520',
                GCP_BUCKET_NAME: gcsBucket.name,
                MAILGUN_API_KEY: "cfb9ce88c6e1d454e319d482d4e13e91-30b58138-0d506516", // Replace with your Mailgun API key
                MAILGUN_DOMAIN: "demo.webappassignment.me", // Replace with your Mailgun domain
                DYNAMO_DB_TABLE: dynamoDBTable.name,
                // MAILGUN_EMAIL_FROM: "pancholi.n@northeastern.edu", // Replace with the email you want to send from
                // ... (other environment variables)
            },
        },
        role: lambdaRole.arn, // Specify the IAM role ARN created for the Lambda function
        // ... (other Lambda function properties)
    });

    // Create a Lambda permission to allow SNS to invoke the Lambda function
    const lambdaPermission = new aws.lambda.Permission("lambdaPermission", {
        action: "lambda:InvokeFunction",
        function: lambdaFunction.name,
        principal: "sns.amazonaws.com",
        sourceArn: snsTopic.arn,
    });
   
    // Subscribe the Lambda function to the SNS topic
    const snsTopicSubscription = new aws.sns.TopicSubscription(
        "mySnsTopicSubscription",
        {
        topic: snsTopic.arn,
        protocol: "lambda",
        endpoint: lambdaFunction.arn,
        }
    );

    
    const role = new aws.iam.Role("cloud-watch-user", {
        assumeRolePolicy: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Action: "sts:AssumeRole",
              Effect: "Allow",
              Principal: {
                Service: "ec2.amazonaws.com",
              },
            },
          ],
        }),
      });
       
    const policy = new aws.iam.Policy("examplePolicy", {
        policy: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Action: [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "logs:DescribeLogStreams",
                "cloudwatch:PutMetricData",
                "cloudwatch:GetMetricData",
                "cloudwatch:GetMetricStatistics",
                "cloudwatch:ListMetrics",
                "ec2:DescribeTags",
                "sns:Publish",
                "dynamodb:PutItem",
              ],
              Resource: "*",
            },
          ],
        }),
    });
       
    const rolePolicyAttachment = new aws.iam.RolePolicyAttachment(
        "my-role-policy-attachment",
        {
          role: role.name,
          // policyArn: aws.iam.getPolicy({ name: "CloudWatch_Permission" }).then(p => p.arn),
          policyArn: policy.arn,
        }
      );
       
    const instanceProfile = new aws.iam.InstanceProfile("my-instance-profile", {
        role: role.name,
    });

    const availabilityZones = getFirstNAvailabilityZones(data, availabilityZoneCount); // Choose the first 3 AZs if available AZs are greater than 3
    const vpc = new aws.ec2.Vpc(`${vpcName}`, {
        cidrBlock: `${vpcCidrBlock}`,
        availabilityZones: availabilityZones,
    });
    const internetGateway = new aws.ec2.InternetGateway(`${igwName}`, {
        vpcId: vpc.id, // Associate the Internet Gateway with the VPC
    });

    for (let i = 0; i < availabilityZones.length; i++) {
        const az = availabilityZones[i];
        availabilityZoneNames.push(az);
    }
    const calculateCidrBlock = (index, subnetType) => {
        const subnetNumber = subnetType === `${publicSt}` ? index : index + availabilityZoneCount;
        return `${cidrBlock}.${subnetNumber}${subnetSuffix}`;
    };

    // Create subnets within each availability zone
    for (let i = 0; i < availabilityZoneNames.length; i++) {
        const az = availabilityZoneNames[i];

        // Create public and private subnets using aws.ec2.Subnet
        const publicSubnet = new aws.ec2.Subnet(`${public_Subnet}-${az}-${i}`, {
            vpcId: vpc.id,
            cidrBlock: calculateCidrBlock(i,`${publicSt}`),
            availabilityZone: az,
            mapPublicIpOnLaunch: true,
            tags: {
                Name: `${public_Subnet}`,
            },
        });

        const privateSubnet = new aws.ec2.Subnet(`${private_Subnet}-${az}-${i}`, {
            vpcId: vpc.id,
            cidrBlock: calculateCidrBlock(i,`${privateSt}`),
            availabilityZone: az,
            tags: {
                Name: `${private_Subnet}`,
            },
        });

        publicSubnets.push(publicSubnet);
        privateSubnets.push(privateSubnet);
    }

    const publicRouteTable = new aws.ec2.RouteTable(`${public_rt}`, {
        vpcId: vpc.id,
        tags: {
            Name: `${public_rt}`,
        },
    });

    const privateRouteTable = new aws.ec2.RouteTable(`${private_rt}`, {
        vpcId: vpc.id,
        tags: {
            Name: `${private_rt}`,
        },
    });
    const publicRoute = new aws.ec2.Route(`${public_Route}`, {
        routeTableId: publicRouteTable.id,
        destinationCidrBlock: `${destinationCidr}`,
        gatewayId: internetGateway.id,
    });

    // Associate the public subnets with the public route table
    publicSubnets.forEach((subnet,i) => {
        new aws.ec2.RouteTableAssociation(`${public_route_association}-${subnet.availabilityZone}-${i}`, {
            subnetId: subnet.id,
            routeTableId: publicRouteTable.id,
            tags:{
                Name: `${public_route_association}`,
            },
        });
    });

    // Associate the private subnets with the private route table
    privateSubnets.forEach((subnet,i) => {
        new aws.ec2.RouteTableAssociation(`${private_route_association}-${subnet.availabilityZone}-${i}`, {
            subnetId: subnet.id,
            routeTableId: privateRouteTable.id,
            tags:{
                Name: `${private_route_association}`,
            },
        });
    });

    const loadBalancerSecurityGroup = new aws.ec2.SecurityGroup("loadBalancerSecurityGroup", {
        vpcId: vpc.id,
        ingress: [
            {
                protocol: "tcp",
                fromPort: 80,
                toPort: 80,
                cidrBlocks: ["0.0.0.0/0"],
            },
            {
                protocol: "tcp",
                fromPort: 443,
                toPort: 443,
                cidrBlocks: ["0.0.0.0/0"],
            },
            // {
            //     protocol: "tcp",
            //     fromPort: 3000,
            //     toPort: 3000,
            //     cidrBlocks: ["0.0.0.0/0"],
            // },
        ],
        egress: [
            {
                protocol: "-1",
                fromPort: 0,
                toPort: 0,
                cidrBlocks: ["0.0.0.0/0"],
            }
        ]
    });

    const applicationSecurityGroup = new aws.ec2.SecurityGroup(`${applicationSecurityGroupName}`, {
        vpcId: vpc.id,
        ingress: [
            {
                protocol: `${protocolType}`,
                fromPort: 22,
                toPort: 22,
                cidrBlocks: ["0.0.0.0/0"], 
                // securityGroups: [loadBalancerSecurityGroup.id],
            },
            // {
            //     protocol: `${protocolType}`,
            //     fromPort: 80,
            //     toPort: 80,
            //     securityGroups: [loadBalancerSecurityGroup.id],
            // },
            // {
            //     protocol: `${protocolType}`,
            //     fromPort: 443,
            //     toPort: 443,
            //     securityGroups: [loadBalancerSecurityGroup.id],
            // },
            {
                protocol: `${protocolType}`,
                fromPort: 3000, 
                toPort: 3000, 
                securityGroups: [loadBalancerSecurityGroup.id],
            },
        ],
        egress: [
            {
              fromPort: 3306, 
              toPort: 3306,
              protocol: `${protocolType}`,
              cidrBlocks: [`${destinationCidr}`], 
            },
            {
                fromPort: 443, 
                toPort: 443,
                protocol: `${protocolType}`,
                cidrBlocks: [`${destinationCidr}`], 
            },
        ],
    });


    const rdsParameterGroup = new aws.rds.ParameterGroup(`${rdsParameterGroupName}`, {
        family: `${dbVersion}`, 
        // parameters: [
        //     {
        //         name: "parameter_name",
        //         value: "parameter_value",
        //     },
        //     // Add other parameters as needed
        // ],
    });

    // Create RDS Security Group
    const dbSecurityGroup = new aws.ec2.SecurityGroup(`${dbSecurityGroupName}`, {
        vpcId: vpc.id,
        ingress: [
            {
                fromPort: 3306, 
                toPort: 3306,
                protocol: `${protocolType}`,
                securityGroups: [applicationSecurityGroup.id],
            },
        ],
    });

    const rdsPrivateSubnetOne = privateSubnets[0];
    const rdsPrivateSubnetTwo = privateSubnets[1];

    const rdsSubnetGroup = new aws.rds.SubnetGroup(`${rdsSubnetGroupName}`, {
        subnetIds: [rdsPrivateSubnetOne, rdsPrivateSubnetTwo],
        description: `${des}`,
    });

    // Create RDS Instance
    const rdsInstance = new aws.rds.Instance(`${finalName}`, {
        allocatedStorage: 20, 
        storageType: `${gp}`, 
        engine: `${db}`,
        instanceClass: `${instClass}`,
        dbName: `${finalName}`,
        username: `${finalName}`,
        password: `${pass}`,
        parameterGroupName: rdsParameterGroup.name,
        skipFinalSnapshot: true,
        vpcSecurityGroupIds: [dbSecurityGroup.id],
        dbSubnetGroupName: rdsSubnetGroup.name, 
        multiAz: false,
        tags: {
            Name: `${instName}`,
        },
    });
    endpoint = rdsInstance.endpoint;

    // const userDataScript = pulumi.interpolate `
    // #!/bin/bash
    // #!/bin/bash
    // echo "NODE_ENV=amienv" >> /etc/environment
    // endpoint="${rdsInstance.endpoint}"
    // echo "HOST=\${endpoint%:*}" >> /etc/environment
    // echo "PORT=3306" >> /etc/environment
    // echo DATABASE_USERNAME=csye6225 >> /etc/environment
    // echo DATABASE_PASSWORD=root1234 >> /etc/environment
    // echo DATABASE_NAME=csye6225 >> /etc/environment
    // sudo systemctl start webapp`.apply(s => Buffer.from(s).toString('base64'));

  const selectedPublicSubnet = publicSubnets[0];
//   const ec2Instance = new aws.ec2.Instance(`${ec2InstanceName}`, {
//         instanceType: `${insType}`,
//         ami: `${ami_ID}`, 
//         iamInstanceProfile: instanceProfile.name,
//         vpcSecurityGroupIds: [applicationSecurityGroup.id], 
//         subnetId: selectedPublicSubnet.id, 
//         rootBlockDevice: {
//             volumeSize: 25,
//             volumeType: `${volType}`,
//             deleteOnTermination: true, 
//         },
//         userData: userDataScript,
//         keyName: `${keypairName}`,
//         tags: {
//             Name: ec2InstanceName,
//         },
//     });
    // const myLaunchTemplate = new aws.ec2.LaunchTemplate("asg_launch_config", {
    //     imageId: `${ami_ID}`,
    //     vpcId: vpc.id,
    //     instanceType: "t2.micro",
    //     keyName: `${keypairName}`,
    //     associatePublicIpAddress: true,
    //     userData: userDataScript,
    //     iamInstanceProfile: { arn: instanceProfile.arn }, // Assuming instanceProfile is created earlier
    //     vpcSecurityGroupIds: [applicationSecurityGroup.id], // Assuming applicationSecurityGroup is created earlier
    //     rootBlockDevice:{
    //         volumeSize: 25,
    //         volumeType: "gp2",
    //         deleteOnTermination: true,
    //     }
    // });

    const myLaunchTemplate = new aws.ec2.LaunchTemplate("app-launch-template", {
        imageId: `${ami_ID}`,
        iamInstanceProfile: {
            name: instanceProfile.name,
        },
        instanceType: "t2.micro",
        // If you need to specify a network interface or subnet, you can do so here
        networkInterfaces: [{
            // If you're specifying a subnet within the network interface, uncomment below
            // subnetId: subnetIds[0],
            associatePublicIpAddress: true, // Set to false if you do not want public IPs
            securityGroups: [applicationSecurityGroup.id],
        }],
        rootBlockDevice: {
            volumeSize: 25,
            volumeType: `${volType}`,
            deleteOnTermination: true, 
        },
        keyName: `${keypairName}`,
        // userData: pulumi.interpolate`#!/bin/bash
        //     echo "NODE_ENV=production" >> /etc/environment
        //     endpoint="${rdsInstance.endpoint}"
        //     echo "DB_HOST=\${endpoint%:*}" >> /etc/environment
        //     echo DB_USER=csye6225 >> /etc/environment
        //     echo DB_PASSWORD=root1234 >> /etc/environment
        //     echo DB_NAME=csye6225 >> /etc/environment
        //     sudo systemctl start webapp
        // `.apply(s => s.trim()),
        userData: pulumi.interpolate`#!/bin/bash
        echo "NODE_ENV=amienv" >> /etc/environment
        endpoint="${rdsInstance.endpoint}"
        echo "HOST=\${endpoint%:*}" >> /etc/environment
        echo "PORT=3306" >> /etc/environment
        echo DATABASE_USERNAME=csye6225 >> /etc/environment
        echo DATABASE_PASSWORD=root1234 >> /etc/environment
        echo SNS_TOPIC_ARN="${snsTopic.arn}" >> /etc/environment
        echo DATABASE_NAME=csye6225 >> /etc/environment
        sudo systemctl start webapp
      `.apply(s => Buffer.from(s).toString('base64')),
        tagSpecifications: [{
            resourceType: "instance",
            tags: {
                Name: "WebAppInstance",
            },
        }],
    });


    const myLoadBalancer = new aws.lb.LoadBalancer("myLoadBalancer", {
        internal: false, // Set to true if internal load balancer is needed
        securityGroups: [loadBalancerSecurityGroup.id],
        subnets: publicSubnets, // Use private subnets for the ALB
        loadBalancerType: "application",
    });


    const targetGroup = new aws.lb.TargetGroup("myTargetGroup", {
        port: 3000, // Your application's port
        protocol: "HTTP",
        vpcId: vpc.id,
        targetType: "instance",
        healthCheck: {
            path: "/healthz", // Adjust the health check path as needed
            port: "3000", // Health check port
            matcher: "200",
            protocol: "HTTP",
        },
    });
    
    const myAutoScalingGroup = new aws.autoscaling.Group("my-auto-scaling-group", {
        vpcZoneIdentifiers: [...privateSubnets.map(subnet => subnet.id),
            ...publicSubnets.map(subnet => subnet.id),
        ],
        minSize: 1,
        maxSize: 3,
        desiredCapacity: 1,
        targetGroupArns: [targetGroup.arn],
        launchTemplate: {
            id: myLaunchTemplate.id,
            version: "$Latest",
        },
        healthCheckType: "EC2",
        healthCheckGracePeriod: 300, 
        tags: [
            {
                key: "Name",
                propagateAtLaunch: true,
                value: "MyAutoScalingGroup",
            },
        ],
        autoscalingGroupName:"my-auto-scaling-group",
    });

    myAutoScalingGroup.id.apply(async (autoscalingGroupId) => {
        const scaleUpPolicy = new aws.autoscaling.Policy("scale-up-policy", {
          scalingAdjustment: 1,
          adjustmentType: "ChangeInCapacity",
          cooldown: 60,
          autoscalingGroupName: autoscalingGroupId,
         
        });
       
        const scaleDownPolicy = new aws.autoscaling.Policy("scale-down-policy", {
          scalingAdjustment: -1,
          adjustmentType: "ChangeInCapacity",
          cooldown: 60,
          autoscalingGroupName: autoscalingGroupId,
        });
       
        const highCpuAlarm = new aws.cloudwatch.MetricAlarm("high-cpu-alarm", {
          comparisonOperator: "GreaterThanThreshold",
          evaluationPeriods: 2, // Add this line
            metricName: "CPUUtilization",
            namespace: "AWS/EC2",
            period: 120,
            statistic: "Average",
            threshold: 5,
            alarmActions: [scaleUpPolicy.arn],
            dimensions: {
                AutoScalingGroupName: myAutoScalingGroup.name,
            },
        });
       
        const lowCpuAlarm = new aws.cloudwatch.MetricAlarm("low-cpu-alarm", {
          comparisonOperator: "LessThanThreshold",
          evaluationPeriods: 2, // Add this line
            metricName: "CPUUtilization",
            namespace: "AWS/EC2",
            period: 120,
            statistic: "Average",
            threshold: 3,
            alarmActions: [scaleDownPolicy.arn],
            dimensions: {
                AutoScalingGroupName: myAutoScalingGroup.name,
            },
        });
      });

    
    // Create a target group for the ALB

    // Attach the target group to the ALB
    // const targetGroupAttachment = new aws.lb.TargetGroupAttachment("myTargetGroupAttachment", {
    //     targetGroupArn: targetGroup.arn,
    //     targetId: ec2Instance.id, // Attach the Auto Scaling Group to the target group
    // });
    
    // Create a listener for the ALB
    const listener = new aws.lb.Listener("myListener", {
        loadBalancerArn: myLoadBalancer.arn, // Reference to the ALB you just created
        port: 80, // Port to listen on
        defaultActions: [{
            type: "forward",
            targetGroupArn: targetGroup.arn, // Reference to the target group
        }],
    });
    
    // // Create a listener rule to forward traffic from port 80 to your application instances on port 3000
    // const listenerRule = new aws.lb.ListenerRule("myListenerRule", {
    //     listenerArn: listener.arn,
    //     priority: 1,
    //     actions: [
    //         {
    //             type: "forward",
    //             targetGroupArn: targetGroup.arn,
    //         },
    //     ],
    //     conditions: [
    //         {
    //             pathPattern: {
    //                 values: ["*"],
    //             },
    //         },
    //     ],
    // });  
    const myDomainARecord = new awsRoute53.Record("my-domain-a-record", {
        name: "demo.webappassignment.me",
        type: "A",
        zoneId: "Z01373271VI7ES47A1AF1",
        aliases: [
            {
                name: myLoadBalancer.dnsName,
                zoneId: myLoadBalancer.zoneId,
                evaluateTargetHealth: true,
            },
        ],
        // ttl: 60, // Adjust the TTL value as needed
    });
});
