# APH Wellness Club Project

Use cdk for easier setup
- cdk synth --app "python aws-cdk.py" > aws-cdk.yaml
- cdk deploy --app "python aws-cdk.py"

Also, make sure your github has permission/access keys to do cdk stuff
- IAM user/role must have sufficient permissions

What you need to modify right now for cdk:
1. Modify deploy-config.json for the stack_name and link
2. Of course, don't forget that the IAM user permissions

