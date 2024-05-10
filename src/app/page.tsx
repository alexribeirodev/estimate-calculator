"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Control, FieldValues, SubmitHandler, useForm } from "react-hook-form"
import { z } from "zod"
import { v4 as uuid } from "uuid"
import {
    ColumnDef
} from "@tanstack/react-table"
import { Copy, Download, MoreHorizontal, Share2, Sheet } from "lucide-react"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useSearchParams } from 'next/navigation'
import { CSVLink } from "react-csv"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { DataTable } from "@/components/data-table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

const TaskFormSchema = z.object({
    description: z.string().min(1, {
        message: "Descricao é obrigatória ser preenchida.",
    }),
    estimatedA: z.number({
        required_error: "Estimativa Pessimista é obrigatória ser preenchida.",
        invalid_type_error: "Estimativa Pessimista deve ser um número.",
    }).nonnegative().default(0),
    estimatedB: z.number({
        required_error: "Estimativa Mais Provável é obrigatória ser preenchida.",
        invalid_type_error: "Estimativa Mais Provável deve ser um número.",
    }).nonnegative().default(0),
    estimatedC: z.number({
        required_error: "Estimativa Otimista é obrigatória ser preenchida.",
        invalid_type_error: "Estimativa Otimista deve ser um número.",
    }).nonnegative().default(0),
})
    .refine(schema => {
        return schema.estimatedA > schema.estimatedC
    }, { message: "Estimativa Pessimista precisa ser maior que a estimativa Otimista.", path: ["estimatedA"] })

const ThreePointEstimateSchema = z.object({
    id: z.string().uuid(),
    threePointEstimated: z.number({
        required_error: "Estimativa de 3 Pontos é obrigatória ser preenchida.",
        invalid_type_error: "Estimativa 3 Pontos deve ser um número.",
    }).nonnegative().default(0),
    standardDeviationEstimated: z.number({
        required_error: "Estimativa de Desvio Padrão é obrigatória ser preenchida.",
        invalid_type_error: "Estimativa Desvio Padrão deve ser um número.",
    }).nonnegative().default(0),
})

const TaskWithThreePointSchema = TaskFormSchema.and(ThreePointEstimateSchema)

export default function Home() {
    const searchParams = useSearchParams()
    const [estimateName, setEstimateName] = useState<string>("Nova estimativa")
    const [isCeilNumbers, setIsCeilNumbers] = useState<boolean>(true)
    const [tasks, setTasks] = useState<z.infer<typeof TaskWithThreePointSchema>[]>([])

    const LoadShareData = (codeBase64: any) => {
        if (codeBase64) {
            const code = atob(codeBase64)
            const data = JSON.parse(code)
            setEstimateName(data.estimateName)
            setIsCeilNumbers(data.isCeilNumbers)
            setTasks(data.tasks)
        }
    }

    useEffect(() => {
        const codeBase64 = searchParams.get("code")
        LoadShareData(codeBase64)
    }, [])

    const sharelink = useMemo(() => {
        const data = JSON.stringify({
            estimateName,
            isCeilNumbers,
            tasks,
        })
        if (typeof window !== "undefined") {
            return `${window?.location?.origin}/?code=${btoa(data)}`
        }
        return ""
    }, [estimateName, isCeilNumbers, tasks])

    const CopyHandler = () => {
        navigator.clipboard.writeText(sharelink)
    }

    const taskForm = useForm<z.infer<typeof TaskFormSchema>>({
        resolver: zodResolver(TaskFormSchema),
        defaultValues: {
            description: "",
            estimatedA: 0,
            estimatedB: 0,
            estimatedC: 0,
        },
    })

    const calculateThreePointEstimate = (data: z.infer<typeof TaskFormSchema>) => {
        const threePointEstimate = {
            threePointEstimated: (data.estimatedA + 4 * data.estimatedB + data.estimatedC) / 6,
            standardDeviationEstimated: (data.estimatedA - data.estimatedC) / 6,
        }

        return threePointEstimate
    }

    const addTask = (data: z.infer<typeof TaskFormSchema>) => {
        const threePointEstimate = calculateThreePointEstimate(data)

        const task = {
            id: uuid(),
            ...data,
            ...threePointEstimate,
        }

        setTasks([...tasks, task])
    }

    const deleteTask = (id: string) => {
        const newTasks = tasks.filter(item => item.id !== id)
        setTasks(newTasks)
    }

    const onSubmitTaskForm = (data: z.infer<typeof TaskFormSchema>) => {
        addTask(data)
        taskForm.reset()
    }

    const totalEstimated = useMemo(() => tasks.reduce((total, item) => total + item.threePointEstimated, 0), [tasks])
    const totalStandardDeviation = useMemo(() => tasks.reduce((total, item) => total + item.standardDeviationEstimated, 0), [tasks])

    const CeilNumber = (value: number) => {
        if (isCeilNumbers) {
            return Math.ceil(value)
        } else {
            return value
        }
    }

    const columnsTable: ColumnDef<any>[] = [
        {
            accessorKey: "description",
            header: "Atividade",
        },
        {
            accessorKey: "estimatedA",
            header: "Pessimista (h)",
            cell: ({ row }) => {
                return CeilNumber(Number(row.getValue("estimatedA")))
            },
        },
        {
            accessorKey: "estimatedB",
            header: "Mais Provável (h)",
            cell: ({ row }) => {
                return CeilNumber(Number(row.getValue("estimatedB")))
            },
        },
        {
            accessorKey: "estimatedC",
            header: "Otimista (h)",
            cell: ({ row }) => {
                return CeilNumber(Number(row.getValue("estimatedC")))
            },
        },
        {
            accessorKey: "threePointEstimated",
            header: "Estimativa (h)",
            cell: ({ row }) => {
                return CeilNumber(Number(row.getValue("threePointEstimated")))
            },
        },
        {
            accessorKey: "standardDeviationEstimated",
            header: "Desvio Padrão (h)",
            cell: ({ row }) => {
                return CeilNumber(Number(row.getValue("standardDeviationEstimated")))
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const item = row.original

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem
                                onClick={() => deleteTask(item.id)}
                            >
                                Remover
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]

    return (
        <main className="flex min-h-screen flex-col items-center p-24 font-mono">
            <div className="z-10 w-full max-w-5xl items-center justify-center text-lg lg:flex">
                Calculadora de Estimativas
            </div>
            <div className="z-10 w-full max-w-5xl items-center justify-center text-sm lg:flex">
                by Alex Ribeiro
            </div>

            <div className="justify-center mt-24">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="name">Nome da Estimativa</Label>
                    <Input type="text" id="name" placeholder="Título da estimativa" value={estimateName} onChange={e => setEstimateName(e.target.value)} />
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon" className="align"><Share2 className="h-4 w-4" /></Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Compartilhar Link</DialogTitle>
                                <DialogDescription>
                                    Qualquer um com esse link poderá visualizar essa estimativa e, caso editar, será gerado um novo link.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex items-center space-x-2">
                                <div className="grid flex-1 gap-2">
                                    <Label htmlFor="link" className="sr-only">
                                        Link
                                    </Label>
                                    <Input
                                        id="link"
                                        defaultValue={sharelink}
                                        readOnly
                                    />
                                </div>
                                <Button type="button" size="sm" className="px-3" onClick={CopyHandler}>
                                    <span className="sr-only">Copiar</span>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Form{...taskForm}>
                <form onSubmit={taskForm.handleSubmit(onSubmitTaskForm)} className="justify-center items-center w-full max-w-lg mt-10">
                    <FormField
                        control={taskForm.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem className="mb-4">
                                <FormLabel>Atividade</FormLabel>
                                <FormControl>
                                    <Input placeholder="Nome da atividade" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={taskForm.control}
                        name="estimatedA"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Estimativa Pessimista (h)</FormLabel>
                                <FormControl>
                                    <Input placeholder="Pessimista (h)" {...field} onChange={(e) => field.onChange(Number(e.target.value))} type="number" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={taskForm.control}
                        name="estimatedB"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Estimativa Mais Provável (h)</FormLabel>
                                <FormControl>
                                    <Input placeholder="Mais Provável (h)" {...field} onChange={(e) => field.onChange(Number(e.target.value))} type="number" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={taskForm.control}
                        name="estimatedC"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Estimativa Otimista (h)</FormLabel>
                                <FormControl>
                                    <Input placeholder="Otimista (h)" {...field} onChange={(e) => field.onChange(Number(e.target.value))} type="number" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button className="mt-4" type="submit">Adicionar Atividade</Button>
                </form>
            </Form>

            <div className="flex items-center space-x-2 mt-10">
                <Checkbox id="ceil" checked={isCeilNumbers} onCheckedChange={checked => setIsCeilNumbers(checked ? true : false)} />
                <label
                    htmlFor="terms"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    Arredondar valores para o inteiro mais próximo?
                </label>
            </div>

            <div className="justify-center text-right mt-4">
                <p>Total estimado: {CeilNumber(totalEstimated)}h +/- {CeilNumber(totalStandardDeviation)}h</p>
            </div>

            <CSVLink data={tasks} filename={`${estimateName}_Estimates.csv`} className="flex items-center space-x-2 pt-5" headers={[
                {
                    label: 'id',
                    key: 'id'
                },
                {
                    label: 'Atividade',
                    key: 'description'
                },
                {
                    label: 'Estimativa Pessimista (h)',
                    key: 'estimatedA'
                },
                {
                    label: 'Estimativa Mais Provável (h)',
                    key: 'estimatedB'
                },
                {
                    label: 'Estimativa Otimista (h)',
                    key: 'estimatedC'
                },
                {
                    label: 'Estimativa (h)',
                    key: 'threePointEstimated'
                },
                {
                    label: 'Desvio Padrão (h)',
                    key: 'standardDeviationEstimated'
                }
            ]}>
                <Button variant="outline" size="default" className="align"><Download className="h-4 w-4 mr-2" /> Download CSV</Button>
            </CSVLink>

            <div className="container mx-auto py-5">
                <DataTable columns={columnsTable} data={tasks} />
            </div>
        </main>
    );
}
