#!/usr/bin/env python3
import os
import boto3
import aws_cdk as cdk
from aws_cdk import (
    Stack,
    aws_s3 as s3,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_route53 as route53,
    aws_route53_targets as targets,
    aws_certificatemanager as acm,
    aws_iam as iam,
    aws_lambda as lambda_,
    aws_apigateway as apigateway,
    aws_dynamodb as dynamodb,
    RemovalPolicy,
    CfnOutput,
    Environment,
    CfnParameter,
)
from constructs import Construct

# Get AWS account information using the specified profile
session = boto3.Session(profile_name='sam')
account_id = session.client('sts').get_caller_identity()['Account']

class AphWellnessClubStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Define stage parameter
        stage = CfnParameter(
            self, "Stage",
            type="String",
            default="dev",
            allowed_values=["dev", "prod"],
            description="Deployment stage (dev or prod)"
        )

        # Define domain name
        domain_name = "aphwellnessclubdev.stashbysam.com"
        parent_domain = "stashbysam.com"
        
        # Create S3 bucket for website
        website_bucket = s3.Bucket(
            self, "AphWellnessClubBucket",
            bucket_name=domain_name,
            removal_policy=RemovalPolicy.RETAIN,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            encryption=s3.BucketEncryption.S3_MANAGED,
            versioned=True,
            auto_delete_objects=False,
        )

        # Create S3 bucket for steps photos
        steps_photo_bucket = s3.Bucket(
            self, "StepsPhotoBucket",
            bucket_name=f"biggestloser8152-steps-{stage.value_as_string}",
            cors=[
                s3.CorsRule(
                    allowed_methods=[s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
                    allowed_origins=["*"],
                    allowed_headers=["*"],
                    max_age=3000
                )
            ]
        )
        
        # Create DynamoDB tables
        weights_table = dynamodb.Table(
            self, "WeightsTable",
            table_name=f"Weights-{stage.value_as_string}",
            partition_key=dynamodb.Attribute(name="username", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="date", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.RETAIN
        )

        steps_table = dynamodb.Table(
            self, "StepsTable",
            table_name=f"Steps-{stage.value_as_string}",
            partition_key=dynamodb.Attribute(name="username", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="date", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.RETAIN
        )

        # Create Lambda functions
        api_handler = lambda_.Function(
            self, "ApiHandler",
            runtime=lambda_.Runtime.NODEJS_22_X,
            handler="back_end/index_aws.handler",
            code=lambda_.Code.from_asset("back_end"),
            timeout=cdk.Duration.seconds(60),
            memory_size=128,
            environment={
                "STAGE": stage.value_as_string
            }
        )

        steps_api_handler = lambda_.Function(
            self, "StepsApiHandler",
            runtime=lambda_.Runtime.NODEJS_22_X,
            handler="back_end/index_aws_steps.handler",
            code=lambda_.Code.from_asset("back_end"),
            timeout=cdk.Duration.seconds(60),
            memory_size=128,
            environment={
                "STAGE": stage.value_as_string
            }
        )

        # Grant permissions
        weights_table.grant_read_write_data(api_handler)
        steps_table.grant_read_write_data(steps_api_handler)
        steps_photo_bucket.grant_read_write(steps_api_handler)
        
        # Create API Gateway
        api = apigateway.RestApi(
            self, "AphWellnessClubApi",
            rest_api_name=f"AphWellnessClubApi-{stage.value_as_string}",
            description="API for Aph Wellness Club",
            default_cors_preflight_options=apigateway.CorsOptions(
                allow_origins=apigateway.Cors.ALL_ORIGINS,
                allow_methods=apigateway.Cors.ALL_METHODS,
                allow_headers=["Content-Type", "X-Amz-Date", "Authorization", "X-Api-Key", 
                             "X-Amz-Security-Token", "X-Amz-User-Agent"]
            )
        )

        # Add API endpoints
        api_handler_integration = apigateway.LambdaIntegration(api_handler)
        steps_api_handler_integration = apigateway.LambdaIntegration(steps_api_handler)

        # API Handler endpoints
        api.root.add_resource("check-username").add_method("POST", api_handler_integration)
        api.root.add_resource("check-weight").add_method("POST", api_handler_integration)
        api.root.add_resource("get-weekly-leaderboard").add_method("GET", api_handler_integration)
        api.root.add_resource("get-overall-leaderboard").add_method("GET", api_handler_integration)
        api.root.add_resource("get-user-stat").add_method("GET", api_handler_integration)
        api.root.add_resource("check-index-form").add_method("POST", api_handler_integration)

        # Steps API Handler endpoints
        api.root.add_resource("login_steps").add_method("POST", steps_api_handler_integration)
        api.root.add_resource("submit_steps").add_method("POST", steps_api_handler_integration)
        api.root.add_resource("submit_photo_proof").add_method("POST", steps_api_handler_integration)
        api.root.add_resource("overall_steps_leaderboard").add_method("GET", steps_api_handler_integration)
        api.root.add_resource("weekly_steps_leaderboard").add_method("GET", steps_api_handler_integration)
        user_steps_stats = api.root.add_resource("user_steps_stats")
        user_steps_stats.add_resource("{username}").add_method("GET", steps_api_handler_integration)
        
        # Create Origin Access Control
        origin_access_control = cloudfront.CfnOriginAccessControl(
            self, "AphWellnessClubOAC",
            origin_access_control_config=cloudfront.CfnOriginAccessControl.OriginAccessControlConfigProperty(
                name=f"OAC-{domain_name}",
                origin_access_control_origin_type="s3",
                signing_behavior="always",
                signing_protocol="sigv4"
            )
        )
        
        # Create CloudFront distribution
        distribution = cloudfront.Distribution(
            self, "AphWellnessClubDistribution",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3BucketOrigin(
                    website_bucket,
                    origin_access_control_id=origin_access_control.attr_id
                ),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED,
            ),
            domain_names=[domain_name],
            certificate=acm.Certificate.from_certificate_arn(
                self, "ExistingCertificate",
                certificate_arn=f"arn:aws:acm:us-east-1:{account_id}:certificate/8e7d9b94-c3fd-4d2c-a60e-987d2451394f"
            ),
            comment=f"Distribution for {domain_name}",
            default_root_object="index.html"
        )
        
        # Update bucket policy for OAC
        website_bucket.add_to_resource_policy(
            iam.PolicyStatement(
                actions=["s3:GetObject"],
                resources=[website_bucket.arn_for_objects("*")],
                principals=[iam.ServicePrincipal("cloudfront.amazonaws.com")],
                conditions={
                    "StringEquals": {
                        "AWS:SourceArn": f"arn:aws:cloudfront::{account_id}:distribution/{distribution.distribution_id}"
                    }
                }
            )
        )
        
        # Get the hosted zone
        hosted_zone = route53.HostedZone.from_hosted_zone_attributes(
            self, "HostedZone",
            hosted_zone_id="Z04414971F9FAWQ209TFO",
            zone_name=parent_domain
        )
        
        # Create DNS records
        route53.ARecord(
            self, "ApexARecord",
            zone=hosted_zone,
            target=route53.RecordTarget.from_alias(
                targets.CloudFrontTarget(distribution)
            ),
            record_name=domain_name
        )
        
        route53.AaaaRecord(
            self, "ApexAAAARecord",
            zone=hosted_zone,
            target=route53.RecordTarget.from_alias(
                targets.CloudFrontTarget(distribution)
            ),
            record_name=domain_name
        )
        
        # Outputs
        CfnOutput(self, "BucketName", value=website_bucket.bucket_name)
        CfnOutput(self, "DistributionDomainName", value=distribution.distribution_domain_name)
        CfnOutput(self, "DistributionId", value=distribution.distribution_id)
        CfnOutput(self, "ApiEndpoint", value=f"{api.url}{stage.value_as_string}/")
        CfnOutput(self, "WeightsTableName", value=weights_table.table_name)
        CfnOutput(self, "StepsTableName", value=steps_table.table_name)
        CfnOutput(self, "StepsPhotoBucketName", value=steps_photo_bucket.bucket_name)
        CfnOutput(self, "DeploymentStage", value=stage.value_as_string)

app = cdk.App()
AphWellnessClubStack(app, "AphWellnessClubStack", 
    env=Environment(
        account=account_id,
        region="us-east-1"
    )
)
app.synth()
