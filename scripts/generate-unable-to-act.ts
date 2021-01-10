import {Excel, Row} from '@kobold/excel'
import {buildKoboldXIV} from '@kobold/xiv'
import fs from 'fs'

main().catch(e => {
	console.error(e)
	process.exit(1)
})

interface UTAStatus {
	id: number
	name: string
	reasons: string[]
}

async function main() {
	// Set up kobold
	const kobold = await buildKoboldXIV()
	const excel = new Excel({kobold})
	const statuses = await excel.getSheet(Status)

	// Build the list of statuses that imply inability to act
	const utaStatuses: UTAStatus[] = []
	for await (const status of statuses.getRows()) {
		if (!status.lockActions && !status.lockControl) {
			continue
		}

		utaStatuses.push({
			id: status.index,
			name: status.name,
			reasons: [
				...status.lockActions ? ['lockActions'] : [],
				...status.lockControl ? ['lockControl'] : [],
			],
		})
	}

	// Codegen
	const statusLines = utaStatuses
		.map(meta => `\t${meta.id}, // ${meta.name} (${meta.reasons.join(', ')})`)
	const fileContents = `/* eslint-disable */
// This file is automatically generated. Do not edit.
// If you wish to regenerate, run \`yarn generate\`.
export const UNABLE_TO_ACT_STATUS_IDS = [
${statusLines.join('\n')}
]
`

	fs.writeFileSync('./src/generated/unableToActStatusIds.ts', fileContents)
}

class Status extends Row {
	static sheet = 'Status'

	name = this.string({column: 0})
	lockActions = this.boolean({column: 10})
	lockControl = this.boolean({column: 11})
}
