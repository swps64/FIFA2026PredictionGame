targetScope = 'resourceGroup'

@description('Location for all resources')
param location string = resourceGroup().location

@description('Environment name used for naming resources')
param environmentName string

@description('Admin password hash for admin API (sha256 of admin password)')
@secure()
param adminPasswordHash string

// ─────────────────────────────────────────
// Names
// ─────────────────────────────────────────
var cosmosAccountName  = 'cosmos-worldcup-${environmentName}'
var swaName            = 'swa-worldcup-${environmentName}'
var databaseName       = 'worldcup2026'

// ─────────────────────────────────────────
// Cosmos DB — Free Tier, NoSQL
// ─────────────────────────────────────────
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: cosmosAccountName
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    enableFreeTier: true
    databaseAccountOfferType: 'Standard'
    consistencyPolicy: { defaultConsistencyLevel: 'Session' }
    locations: [
      { locationName: location, failoverPriority: 0, isZoneRedundant: false }
    ]
    capabilities: [ { name: 'EnableServerless' } ]
  }
}

resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-05-15' = {
  parent: cosmosAccount
  name: databaseName
  properties: {
    resource: { id: databaseName }
  }
}

resource containerRooms 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: cosmosDatabase
  name: 'rooms'
  properties: {
    resource: {
      id: 'rooms'
      partitionKey: { paths: [ '/id' ], kind: 'Hash' }
      indexingPolicy: { indexingMode: 'consistent' }
    }
  }
}

resource containerPredictions 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: cosmosDatabase
  name: 'predictions'
  properties: {
    resource: {
      id: 'predictions'
      partitionKey: { paths: [ '/roomId' ], kind: 'Hash' }
      indexingPolicy: { indexingMode: 'consistent' }
    }
  }
}

resource containerResults 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: cosmosDatabase
  name: 'results'
  properties: {
    resource: {
      id: 'results'
      partitionKey: { paths: [ '/id' ], kind: 'Hash' }
      indexingPolicy: { indexingMode: 'consistent' }
    }
  }
}

// ─────────────────────────────────────────
// Static Web App — Free SKU
// ─────────────────────────────────────────
resource swa 'Microsoft.Web/staticSites@2023-12-01' = {
  name: swaName
  location: location
  sku: { name: 'Free', tier: 'Free' }
  properties: {
    buildProperties: {
      skipGithubActionWorkflowGeneration: true
    }
  }
}

// App settings injected into SWA Managed Functions
resource swaAppSettings 'Microsoft.Web/staticSites/config@2023-12-01' = {
  parent: swa
  name: 'appsettings'
  properties: {
    COSMOS_ENDPOINT:      cosmosAccount.properties.documentEndpoint
    COSMOS_KEY:           cosmosAccount.listKeys().primaryMasterKey
    COSMOS_DATABASE:      databaseName
    ADMIN_PASSWORD_HASH:  adminPasswordHash
  }
}

// ─────────────────────────────────────────
// Outputs
// ─────────────────────────────────────────
output swaHostname      string = swa.properties.defaultHostname
output cosmosEndpoint   string = cosmosAccount.properties.documentEndpoint
output swaName          string = swa.name
