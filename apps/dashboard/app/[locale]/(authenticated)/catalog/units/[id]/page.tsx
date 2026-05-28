import { notFound } from "next/navigation"

// Dummy simulation of a backend fetch
async function getUnit(id: string) {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500))
  
  if (id === "404") return null
  
  return {
    id,
    name: `Unit ${id}`,
    code: `U-${id}`,
    description: `This is a dynamically fetched unit with ID: ${id}`,
  }
}

export async function generateMetadata({ params: { id, locale } }: { params: { id: string, locale: string } }) {
  const unit = await getUnit(id)
  
  if (!unit) {
    return {
      title: "Unit Not Found",
    }
  }

  return {
    title: `Unit ${unit.name} | ERP Dashboard`,
    description: unit.description,
  }
}

export default async function UnitDetailsPage({
  params: { id, locale },
}: {
  params: { id: string; locale: string }
}) {
  const unit = await getUnit(id)

  if (!unit) {
    notFound()
  }

  return (
    <div className="p-6">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-2">Unit Details</h1>
        <div className="space-y-4 mt-6">
           <div className="grid grid-cols-2 gap-4 max-w-md">
             <div className="text-sm text-muted-foreground">ID</div>
             <div className="font-medium">{unit.id}</div>
             
             <div className="text-sm text-muted-foreground">Name</div>
             <div className="font-medium">{unit.name}</div>
             
             <div className="text-sm text-muted-foreground">Code</div>
             <div className="font-medium">{unit.code}</div>
           </div>
        </div>
      </div>
    </div>
  )
}
