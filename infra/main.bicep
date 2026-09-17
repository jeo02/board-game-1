targetScope = 'subscription'

@description('Azure region for the resource group and App Service resources.')
param location string = 'westus3'

@description('Resource group that contains the game hosting resources.')
param resourceGroupName string

@description('Name of the Linux App Service plan.')
param appServicePlanName string

@description('Globally unique name of the web app.')
param webAppName string

resource resourceGroup 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
}

module appService 'app-service.bicep' = {
  name: 'deployGameAppService'
  scope: resourceGroup
  params: {
    location: location
    appServicePlanName: appServicePlanName
    webAppName: webAppName
  }
}

output webAppName string = appService.outputs.webAppName
output webAppUrl string = appService.outputs.webAppUrl
