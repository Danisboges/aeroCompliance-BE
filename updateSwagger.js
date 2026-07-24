const fs = require('fs');
const data = JSON.parse(fs.readFileSync('swagger.json'));

data.components.schemas.EesWebhookRequest.properties.references = {
  type: 'array',
  items: { type: 'string' },
  example: ['GE90-100 Boeing 777 Aircraft Maintenance Manual (AMM)']
};
data.components.schemas.EesWebhookRequest.properties.component_type = { type: 'string', example: 'FAN HUB FRAME ASSEMBLY' };
data.components.schemas.EesWebhookRequest.properties.compliance_time_type = { type: 'string', example: 'Prior to 20,000 cycles' };
data.components.schemas.EesWebhookRequest.properties.repetitive = { type: 'boolean', example: false };
data.components.schemas.EesWebhookRequest.properties.note = { type: 'string', example: 'Do not mix parts' };

fs.writeFileSync('swagger.json', JSON.stringify(data, null, 2));
