const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");

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


    const applicationSecurityGroup = new aws.ec2.SecurityGroup(`${applicationSecurityGroupName}`, {
        vpcId: vpc.id,
        ingress: [
            {
                protocol: `${protocolType}`,
                fromPort: 22,
                toPort: 22,
                cidrBlocks: [`${destinationCidr}`],
            },
            {
                protocol: `${protocolType}`,
                fromPort: 80,
                toPort: 80,
                cidrBlocks: [`${destinationCidr}`], 
            },
            {
                protocol: `${protocolType}`,
                fromPort: 443,
                toPort: 443,
                cidrBlocks: [`${destinationCidr}`], 
            },
            {
                protocol: `${protocolType}`,
                fromPort: 3000, 
                toPort: 3000, 
                cidrBlocks: [`${destinationCidr}`], 
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
  
    const userDataScript = pulumi.interpolate `
    #!/bin/bash
    #!/bin/bash
    echo "NODE_ENV=amienv" >> /etc/environment
    endpoint="${rdsInstance.endpoint}"
    echo "HOST=\${endpoint%:*}" >> /etc/environment
    echo "PORT=3306" >> /etc/environment
    echo DATABASE_USERNAME=csye6225 >> /etc/environment
    echo DATABASE_PASSWORD=root1234 >> /etc/environment
    echo DATABASE_NAME=csye6225 >> /etc/environment
    sudo systemctl start webapp`.apply((s) => s.trim());

  const selectedPublicSubnet = publicSubnets[0];
  const ec2Instance = new aws.ec2.Instance(`${ec2InstanceName}`, {
        instanceType: `${insType}`,
        ami: `${ami_ID}`, 
        iamInstanceProfile: instanceProfile.name,
        vpcSecurityGroupIds: [applicationSecurityGroup.id], 
        subnetId: selectedPublicSubnet.id, 
        rootBlockDevice: {
            volumeSize: 25,
            volumeType: `${volType}`,
            deleteOnTermination: true, 
        },
        userData: userDataScript,
        keyName: `${keypairName}`,
        tags: {
            Name: ec2InstanceName,
        },
    });
    const myDomainARecord = new awsRoute53.Record("my-domain-a-record", {
        name: "demo.webappassignment.me",
        type: "A",
        zoneId: "Z01373271VI7ES47A1AF1", // Replace with your Route53 hosted zone ID
        ttl: 300, // Adjust the TTL value as needed
        records: [ec2Instance.publicIp], // Use the public IP of your EC2 instance
    });
});
