#!/usr/bin/env python3
"""
Simulação de dados do Ginásio KO
Cria dados para 2 meses (Outubro 2024 e Outubro 2025) com ~100 membros
"""

import asyncio
import random
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import uuid

# Configuração
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "ginasio_ko"

# Dados de atividades (modalidades)
ACTIVITIES = {
    "Boxe": {"monthly_fee": 45.00, "percentage": 0.30},
    "Kickboxing": {"monthly_fee": 50.00, "percentage": 0.25},
    "Jiu-Jitsu": {"monthly_fee": 55.00, "percentage": 0.25},
    "Musculação": {"monthly_fee": 40.00, "percentage": 0.20}
}

# Nomes portugueses para membros
FIRST_NAMES = [
    "João", "Maria", "Pedro", "Ana", "Miguel", "Catarina", "Tiago", "Sofia",
    "Ricardo", "Inês", "Bruno", "Mariana", "André", "Beatriz", "Paulo",
    "Rita", "Carlos", "Joana", "Luís", "Sara", "Rui", "Marta", "Nuno",
    "Patrícia", "Diogo", "Cláudia", "Hugo", "Isabel", "Filipe", "Teresa",
    "Gonçalo", "Francisca", "Vasco", "Leonor", "António", "Carolina",
    "Marco", "Diana", "José", "Raquel", "Manuel", "Cristina", "Francisco",
    "Susana", "Tomás", "Mónica", "Rafael", "Vera", "Daniel", "Alexandra"
]

LAST_NAMES = [
    "Silva", "Santos", "Ferreira", "Pereira", "Oliveira", "Costa", "Rodrigues",
    "Martins", "Jesus", "Sousa", "Fernandes", "Gonçalves", "Gomes", "Lopes",
    "Marques", "Alves", "Almeida", "Ribeiro", "Pinto", "Carvalho", "Teixeira",
    "Moreira", "Correia", "Mendes", "Nunes", "Soares", "Vieira", "Monteiro"
]

async def clear_data(db):
    """Limpa dados existentes"""
    print("🗑️  Limpando dados existentes...")
    await db.members.delete_many({})
    await db.payments.delete_many({})
    await db.expenses.delete_many({})
    await db.revenues.delete_many({})
    await db.attendance.delete_many({})
    await db.stock.delete_many({})
    print("✅ Dados limpos")

async def get_activities(db):
    """Busca IDs das atividades"""
    activities = await db.activities.find().to_list(None)
    activity_map = {act['name']: act['id'] for act in activities}
    return activity_map

async def create_members(db, activity_map, num_members=100):
    """Cria membros com distribuição por modalidade"""
    print(f"\n👥 Criando {num_members} membros...")
    
    members = []
    member_number_start = 1001
    
    for i in range(num_members):
        # Escolhe modalidade baseado na percentagem
        rand = random.random()
        cumulative = 0
        selected_activity = None
        
        for activity_name, config in ACTIVITIES.items():
            cumulative += config['percentage']
            if rand <= cumulative:
                selected_activity = activity_name
                break
        
        if not selected_activity:
            selected_activity = list(ACTIVITIES.keys())[0]
        
        # Gera dados do membro
        first_name = random.choice(FIRST_NAMES)
        last_name = random.choice(LAST_NAMES)
        
        member = {
            "id": str(uuid.uuid4()),
            "member_number": str(member_number_start + i),
            "name": f"{first_name} {last_name}",
            "email": f"{first_name.lower()}.{last_name.lower()}{i}@gym.com",
            "phone": f"9{random.randint(10000000, 99999999)}",
            "date_of_birth": f"19{random.randint(80, 99)}-{random.randint(1, 12):02d}-{random.randint(1, 28):02d}",
            "gender": random.choice(["male", "female"]),
            "activity_id": activity_map.get(selected_activity),
            "status": "active",
            "membership_start": "2024-01-01",
            "created_at": datetime.now().isoformat()
        }
        
        members.append(member)
    
    await db.members.insert_many(members)
    print(f"✅ {len(members)} membros criados")
    return members

async def create_payments(db, members, year, month):
    """Cria pagamentos de mensalidades para um mês específico"""
    print(f"\n💰 Criando pagamentos para {month:02d}/{year}...")
    
    payments = []
    payment_date = datetime(year, month, random.randint(1, 5))
    
    # 90% dos membros pagam
    paying_members = random.sample(members, int(len(members) * 0.9))
    
    for member in paying_members:
        # Encontra a modalidade do membro
        activity_name = None
        for name, config in ACTIVITIES.items():
            if member.get('activity_id'):
                activity_name = name
                break
        
        # Determina valor baseado na modalidade
        amount = 45.00  # default
        for name, config in ACTIVITIES.items():
            if member.get('activity_id'):
                # Usa o nome da atividade para determinar o valor
                activity_name = name
                amount = config['monthly_fee']
                break
        
        payment = {
            "id": str(uuid.uuid4()),
            "member_id": member['id'],
            "amount": amount,
            "payment_method": "membership",
            "description": f"Mensalidade {month:02d}/{year}",
            "payment_date": payment_date.strftime("%Y-%m-%d"),
            "status": "paid",
            "created_at": datetime.now().isoformat()
        }
        
        payments.append(payment)
    
    if payments:
        await db.payments.insert_many(payments)
    
    total_revenue = sum(p['amount'] for p in payments)
    print(f"✅ {len(payments)} pagamentos criados - Total: €{total_revenue:.2f}")
    return payments

async def create_expenses(db, year, month):
    """Cria despesas mensais"""
    print(f"\n💸 Criando despesas para {month:02d}/{year}...")
    
    expenses = []
    expense_date = datetime(year, month, 1)
    
    # Despesas fixas
    fixed_expenses = [
        {"category": "rent", "description": "Renda do Ginásio", "amount": 1200.00},
        {"category": "energy", "description": "Eletricidade e Água", "amount": 350.00},
    ]
    
    # Despesas variáveis
    variable_expenses = [
        {"category": "maintenance", "description": "Manutenção de Equipamentos", "amount": random.uniform(100, 300)},
        {"category": "extras", "description": "Material de Limpeza", "amount": random.uniform(50, 150)},
        {"category": "textil", "description": "Compra de T-shirts", "amount": random.uniform(200, 400)},
        {"category": "equipment", "description": "Equipamento Desportivo", "amount": random.uniform(300, 600)},
    ]
    
    all_expenses = fixed_expenses + variable_expenses
    
    for exp in all_expenses:
        expense = {
            "id": str(uuid.uuid4()),
            "category": exp['category'],
            "description": exp['description'],
            "amount": exp['amount'],
            "expense_date": expense_date.strftime("%Y-%m-%d"),
            "created_at": datetime.now().isoformat()
        }
        expenses.append(expense)
    
    if expenses:
        await db.expenses.insert_many(expenses)
    
    total_expenses = sum(e['amount'] for e in expenses)
    print(f"✅ {len(expenses)} despesas criadas - Total: €{total_expenses:.2f}")
    return expenses

async def create_revenues_extras(db, year, month):
    """Cria receitas extras (PT, vendas pontuais, etc)"""
    print(f"\n💵 Criando receitas extras para {month:02d}/{year}...")
    
    revenues = []
    
    # Algumas receitas extras aleatórias
    num_extras = random.randint(3, 8)
    
    for i in range(num_extras):
        revenue_date = datetime(year, month, random.randint(1, 28))
        
        revenue = {
            "id": str(uuid.uuid4()),
            "category": "revenueExtras",
            "description": random.choice([
                "Personal Training",
                "Aula Especial",
                "Workshop",
                "Avaliação Física"
            ]),
            "amount": random.uniform(20, 80),
            "revenue_date": revenue_date.strftime("%Y-%m-%d"),
            "created_at": datetime.now().isoformat()
        }
        revenues.append(revenue)
    
    if revenues:
        await db.revenues.insert_many(revenues)
    
    total_revenue = sum(r['amount'] for r in revenues)
    print(f"✅ {len(revenues)} receitas extras criadas - Total: €{total_revenue:.2f}")
    return revenues

async def create_stock_items(db, year, sold_quantity_multiplier=1.0):
    """Cria items de stock com vendas históricas"""
    print(f"\n📦 Criando items de stock para {year}...")
    
    items = [
        {"name": "T-shirt Ginásio KO", "category": "textil", "price": 15.00, "purchase_price": 8.00, "quantity": 50, "base_sold": 25},
        {"name": "Calção de Treino", "category": "textil", "price": 20.00, "purchase_price": 10.00, "quantity": 30, "base_sold": 15},
        {"name": "Luvas de Boxe", "category": "equipment", "price": 35.00, "purchase_price": 18.00, "quantity": 20, "base_sold": 12},
        {"name": "Protetor Bucal", "category": "equipment", "price": 10.00, "purchase_price": 4.00, "quantity": 40, "base_sold": 30},
        {"name": "Bandas Elásticas", "category": "equipment", "price": 12.00, "purchase_price": 6.00, "quantity": 25, "base_sold": 18},
    ]
    
    stock_items = []
    for item in items:
        # Calculate sold quantity with variation
        sold_qty = int(item['base_sold'] * sold_quantity_multiplier)
        
        stock_item = {
            "id": str(uuid.uuid4()),
            "name": item['name'],
            "category": item['category'],
            "price": item['price'],
            "sale_price": item['price'],  # Add sale_price
            "purchase_price": item['purchase_price'],
            "quantity": item['quantity'],
            "sold_quantity": sold_qty,
            "created_at": datetime(year, 1, 1).isoformat()
        }
        stock_items.append(stock_item)
    
    await db.stock.insert_many(stock_items)
    
    total_invested = sum(item['quantity'] * item['purchase_price'] for item in items)
    total_sold = sum(int(item['base_sold'] * sold_quantity_multiplier) * item['price'] for item in items)
    
    print(f"✅ {len(stock_items)} items de stock criados")
    print(f"   Valor investido: €{total_invested:.2f}")
    print(f"   Valor vendido: €{total_sold:.2f}")
    print(f"   Margem: €{total_sold - total_invested:.2f}")
    
    return stock_items

async def create_attendance(db, members, year, month):
    """Cria registos de presença"""
    print(f"\n✅ Criando presenças para {month:02d}/{year}...")
    
    attendance_records = []
    days_in_month = 30
    
    # Cada membro ativo tem presença em dias aleatórios
    for member in members:
        # Membros ativos vêm entre 8-20 vezes por mês
        num_visits = random.randint(8, 20)
        
        visited_days = random.sample(range(1, days_in_month + 1), min(num_visits, days_in_month))
        
        for day in visited_days:
            check_in_time = datetime(year, month, day, random.randint(6, 21), random.randint(0, 59))
            
            attendance = {
                "id": str(uuid.uuid4()),
                "member_id": member['id'],
                "activity_id": member.get('activity_id'),
                "check_in_date": check_in_time.strftime("%Y-%m-%d"),
                "check_in_time": check_in_time.strftime("%H:%M:%S"),
                "created_at": datetime.now().isoformat()
            }
            attendance_records.append(attendance)
    
    if attendance_records:
        await db.attendance.insert_many(attendance_records)
    
    print(f"✅ {len(attendance_records)} presenças criadas")
    return attendance_records

async def main():
    print("=" * 60)
    print("🏋️  SIMULAÇÃO DE DADOS - GINÁSIO KO")
    print("=" * 60)
    
    # Conectar ao MongoDB
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Limpar dados existentes
    await clear_data(db)
    
    # Buscar atividades
    activity_map = await get_activities(db)
    print(f"\n📋 Atividades disponíveis: {list(activity_map.keys())}")
    
    # Criar membros
    members = await create_members(db, activity_map, num_members=100)
    
    # Criar stock items
    stock_items = await create_stock_items(db)
    
    # === OUTUBRO 2024 (Período Anterior) ===
    print("\n" + "=" * 60)
    print("📅 PERÍODO ANTERIOR: OUTUBRO 2024")
    print("=" * 60)
    
    await create_payments(db, members, 2024, 10)
    await create_expenses(db, 2024, 10)
    await create_revenues_extras(db, 2024, 10)
    await create_attendance(db, members, 2024, 10)
    
    # === OUTUBRO 2025 (Período Atual) ===
    print("\n" + "=" * 60)
    print("📅 PERÍODO ATUAL: OUTUBRO 2025")
    print("=" * 60)
    
    await create_payments(db, members, 2025, 10)
    await create_expenses(db, 2025, 10)
    await create_revenues_extras(db, 2025, 10)
    await create_attendance(db, members, 2025, 10)
    
    # Resumo final
    print("\n" + "=" * 60)
    print("📊 RESUMO DA SIMULAÇÃO")
    print("=" * 60)
    
    total_members = await db.members.count_documents({})
    total_payments = await db.payments.count_documents({})
    total_expenses = await db.expenses.count_documents({})
    total_revenues = await db.revenues.count_documents({})
    total_attendance = await db.attendance.count_documents({})
    
    print(f"👥 Membros: {total_members}")
    print(f"💰 Pagamentos: {total_payments}")
    print(f"💸 Despesas: {total_expenses}")
    print(f"💵 Receitas Extras: {total_revenues}")
    print(f"✅ Presenças: {total_attendance}")
    
    # Calcular totais financeiros para ambos os períodos
    payments_2024 = await db.payments.find({"payment_date": {"$regex": "^2024-10"}}).to_list(None)
    payments_2025 = await db.payments.find({"payment_date": {"$regex": "^2025-10"}}).to_list(None)
    
    expenses_2024 = await db.expenses.find({"expense_date": {"$regex": "^2024-10"}}).to_list(None)
    expenses_2025 = await db.expenses.find({"expense_date": {"$regex": "^2025-10"}}).to_list(None)
    
    revenue_2024 = sum(p['amount'] for p in payments_2024)
    revenue_2025 = sum(p['amount'] for p in payments_2025)
    
    expense_2024 = sum(e['amount'] for e in expenses_2024)
    expense_2025 = sum(e['amount'] for e in expenses_2025)
    
    print("\n📈 COMPARAÇÃO FINANCEIRA:")
    print(f"Outubro 2024: Receita €{revenue_2024:.2f} | Despesa €{expense_2024:.2f} | Líquido €{revenue_2024 - expense_2024:.2f}")
    print(f"Outubro 2025: Receita €{revenue_2025:.2f} | Despesa €{expense_2025:.2f} | Líquido €{revenue_2025 - expense_2025:.2f}")
    
    variation = ((revenue_2025 - revenue_2024) / revenue_2024 * 100) if revenue_2024 > 0 else 0
    print(f"Variação de Receita: {variation:+.1f}%")
    
    print("\n" + "=" * 60)
    print("✅ SIMULAÇÃO CONCLUÍDA COM SUCESSO!")
    print("=" * 60)
    print("\n🎯 Agora pode ir para a página de Relatórios e ativar a comparação!")

if __name__ == "__main__":
    asyncio.run(main())
