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
    RemovalPolicy,
    CfnOutput,
    Environment,
)
from constructs import Construct

# Get AWS account information using the specified profile
session = boto3.Session(profile_name='sam')
account_id = session.client('sts').get_caller_identity()['Account']

class AphWellnessClubStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Define domain name
        domain_name = "aphwellnessclubdev.stashbysam.com"
        parent_domain = "stashbysam.com"
        
        # Create S3 bucket
        bucket = s3.Bucket(
            self, "AphWellnessClubBucket",
            bucket_name=domain_name,
            removal_policy=RemovalPolicy.RETAIN,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            encryption=s3.BucketEncryption.S3_MANAGED,
            versioned=True,
            auto_delete_objects=False,
        )
        
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
                    bucket,
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
        bucket.add_to_resource_policy(
            iam.PolicyStatement(
                actions=["s3:GetObject"],
                resources=[bucket.arn_for_objects("*")],
                principals=[iam.ServicePrincipal("cloudfront.amazonaws.com")],
                conditions={
                    "StringEquals": {
                        "AWS:SourceArn": f"arn:aws:cloudfront::{account_id}:distribution/{distribution.distribution_id}"
                    }
                }
            )
        )
        
        # Get the hosted zone by zone ID instead of lookup
        hosted_zone = route53.HostedZone.from_hosted_zone_attributes(
            self, "HostedZone",
            hosted_zone_id="Z04414971F9FAWQ209TFO",  # Replace with your hosted zone ID
            zone_name=parent_domain
        )
        
        # Create A record
        route53.ARecord(
            self, "ApexARecord",
            zone=hosted_zone,
            target=route53.RecordTarget.from_alias(
                targets.CloudFrontTarget(distribution)
            ),
            record_name=domain_name
        )
        
        # Create AAAA record
        route53.AaaaRecord(
            self, "ApexAAAARecord",
            zone=hosted_zone,
            target=route53.RecordTarget.from_alias(
                targets.CloudFrontTarget(distribution)
            ),
            record_name=domain_name
        )
        
        # Outputs
        CfnOutput(self, "BucketName", value=bucket.bucket_name)
        CfnOutput(self, "DistributionDomainName", value=distribution.distribution_domain_name)
        CfnOutput(self, "DistributionId", value=distribution.distribution_id)

app = cdk.App()
AphWellnessClubStack(app, "AphWellnessClubStack", 
    env=Environment(
        account=account_id,
        region="us-east-1"  # CloudFront requires ACM certificate to be in us-east-1
    )
)
app.synth()
