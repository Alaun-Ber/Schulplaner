import { useSearchParams } from 'react-router-dom'
export function TeachingPlanner(){const[params]=useSearchParams(),tab=params.get('tab')??'uebersicht';return <div className="teaching-page"><div className="embedded-planner"><iframe key={tab} title="Unterrichtsplaner" src={`./unterrichtsplaner.html?tab=${encodeURIComponent(tab)}`}/></div></div>}
