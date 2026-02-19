'use client'

import PriceListTable from './price-list-table'

export default function PriceListGroupComponent({ group }: { group: any }) {
    // Direct pass-through component now that logic is in the Table header
    // Retaining this component as a wrapper to maintain structure if needed in future
    return <PriceListTable group={group} />
}
