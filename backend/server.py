from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'projectflow')]

# JWT Settings
SECRET_KEY = os.environ.get('JWT_SECRET', 'projectflow-super-secret-key-2024')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer()

app = FastAPI(title="ProjectFlow API")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ MODELS ============

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class MilestoneCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    due_date: str
    
class Milestone(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str = ""
    due_date: str
    completed: bool = False
    completed_at: Optional[str] = None

class TimeEntryCreate(BaseModel):
    description: Optional[str] = ""
    duration_minutes: int
    date: str

class TimeEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    description: str = ""
    duration_minutes: int
    date: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    priority: str = "medium"
    due_date: Optional[str] = None
    estimated_hours: Optional[float] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[str] = None
    estimated_hours: Optional[float] = None

class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str = ""
    priority: str = "medium"  # low, medium, high
    status: str = "todo"  # todo, in_progress, done
    due_date: Optional[str] = None
    estimated_hours: Optional[float] = None
    time_entries: List[TimeEntry] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: Optional[str] = None

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    color: str = "#4F46E5"
    deadline: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    deadline: Optional[str] = None
    status: Optional[str] = None

class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    color: str = "#4F46E5"
    status: str = "active"  # active, completed, on_hold
    deadline: Optional[str] = None
    owner_id: str
    tasks: List[Task] = []
    milestones: List[Milestone] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ============ AUTH HELPERS ============

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ============ AUTH ROUTES ============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(user_data.password)
    created_at = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "name": user_data.name,
        "email": user_data.email,
        "password": hashed_password,
        "created_at": created_at
    }
    
    await db.users.insert_one(user_doc)
    
    access_token = create_access_token({"sub": user_id})
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(id=user_id, name=user_data.name, email=user_data.email, created_at=created_at)
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token({"sub": user["id"]})
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(id=user["id"], name=user["name"], email=user["email"], created_at=user["created_at"])
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        created_at=current_user["created_at"]
    )

# ============ PROJECT ROUTES ============

@api_router.get("/projects", response_model=List[Project])
async def get_projects(current_user = Depends(get_current_user)):
    projects = await db.projects.find({"owner_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    return projects

@api_router.post("/projects", response_model=Project)
async def create_project(project_data: ProjectCreate, current_user = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    project = Project(
        name=project_data.name,
        description=project_data.description or "",
        color=project_data.color,
        deadline=project_data.deadline,
        owner_id=current_user["id"],
        created_at=now,
        updated_at=now
    )
    await db.projects.insert_one(project.model_dump())
    return project

@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str, current_user = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id, "owner_id": current_user["id"]}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@api_router.put("/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, project_data: ProjectUpdate, current_user = Depends(get_current_user)):
    update_dict = {k: v for k, v in project_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.projects.find_one_and_update(
        {"id": project_id, "owner_id": current_user["id"]},
        {"$set": update_dict},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Project not found")
    del result["_id"]
    return result

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, current_user = Depends(get_current_user)):
    result = await db.projects.delete_one({"id": project_id, "owner_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted"}

# ============ TASK ROUTES ============

@api_router.post("/projects/{project_id}/tasks", response_model=Task)
async def create_task(project_id: str, task_data: TaskCreate, current_user = Depends(get_current_user)):
    task = Task(
        title=task_data.title,
        description=task_data.description or "",
        priority=task_data.priority,
        due_date=task_data.due_date,
        estimated_hours=task_data.estimated_hours
    )
    
    result = await db.projects.find_one_and_update(
        {"id": project_id, "owner_id": current_user["id"]},
        {
            "$push": {"tasks": task.model_dump()},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        },
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Project not found")
    return task

@api_router.put("/projects/{project_id}/tasks/{task_id}", response_model=Task)
async def update_task(project_id: str, task_id: str, task_data: TaskUpdate, current_user = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id, "owner_id": current_user["id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    tasks = project.get("tasks", [])
    task_index = next((i for i, t in enumerate(tasks) if t["id"] == task_id), None)
    if task_index is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_dict = {k: v for k, v in task_data.model_dump().items() if v is not None}
    
    # Handle status change to done
    if update_dict.get("status") == "done" and tasks[task_index].get("status") != "done":
        update_dict["completed_at"] = datetime.now(timezone.utc).isoformat()
    elif update_dict.get("status") and update_dict.get("status") != "done":
        update_dict["completed_at"] = None
    
    tasks[task_index].update(update_dict)
    
    await db.projects.update_one(
        {"id": project_id},
        {
            "$set": {
                "tasks": tasks,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    return tasks[task_index]

@api_router.delete("/projects/{project_id}/tasks/{task_id}")
async def delete_task(project_id: str, task_id: str, current_user = Depends(get_current_user)):
    result = await db.projects.find_one_and_update(
        {"id": project_id, "owner_id": current_user["id"]},
        {
            "$pull": {"tasks": {"id": task_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    if not result:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Task deleted"}

# ============ TIME TRACKING ROUTES ============

@api_router.post("/projects/{project_id}/tasks/{task_id}/time", response_model=TimeEntry)
async def add_time_entry(project_id: str, task_id: str, time_data: TimeEntryCreate, current_user = Depends(get_current_user)):
    time_entry = TimeEntry(
        description=time_data.description or "",
        duration_minutes=time_data.duration_minutes,
        date=time_data.date
    )
    
    project = await db.projects.find_one({"id": project_id, "owner_id": current_user["id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    tasks = project.get("tasks", [])
    task_index = next((i for i, t in enumerate(tasks) if t["id"] == task_id), None)
    if task_index is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if "time_entries" not in tasks[task_index]:
        tasks[task_index]["time_entries"] = []
    tasks[task_index]["time_entries"].append(time_entry.model_dump())
    
    await db.projects.update_one(
        {"id": project_id},
        {
            "$set": {
                "tasks": tasks,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    return time_entry

@api_router.delete("/projects/{project_id}/tasks/{task_id}/time/{time_id}")
async def delete_time_entry(project_id: str, task_id: str, time_id: str, current_user = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id, "owner_id": current_user["id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    tasks = project.get("tasks", [])
    task_index = next((i for i, t in enumerate(tasks) if t["id"] == task_id), None)
    if task_index is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    tasks[task_index]["time_entries"] = [
        te for te in tasks[task_index].get("time_entries", []) if te["id"] != time_id
    ]
    
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {"tasks": tasks, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Time entry deleted"}

# ============ MILESTONE ROUTES ============

@api_router.post("/projects/{project_id}/milestones", response_model=Milestone)
async def create_milestone(project_id: str, milestone_data: MilestoneCreate, current_user = Depends(get_current_user)):
    milestone = Milestone(
        title=milestone_data.title,
        description=milestone_data.description or "",
        due_date=milestone_data.due_date
    )
    
    result = await db.projects.find_one_and_update(
        {"id": project_id, "owner_id": current_user["id"]},
        {
            "$push": {"milestones": milestone.model_dump()},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        },
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Project not found")
    return milestone

@api_router.put("/projects/{project_id}/milestones/{milestone_id}")
async def update_milestone(project_id: str, milestone_id: str, completed: bool, current_user = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id, "owner_id": current_user["id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    milestones = project.get("milestones", [])
    milestone_index = next((i for i, m in enumerate(milestones) if m["id"] == milestone_id), None)
    if milestone_index is None:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    milestones[milestone_index]["completed"] = completed
    milestones[milestone_index]["completed_at"] = datetime.now(timezone.utc).isoformat() if completed else None
    
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {"milestones": milestones, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return milestones[milestone_index]

@api_router.delete("/projects/{project_id}/milestones/{milestone_id}")
async def delete_milestone(project_id: str, milestone_id: str, current_user = Depends(get_current_user)):
    result = await db.projects.find_one_and_update(
        {"id": project_id, "owner_id": current_user["id"]},
        {
            "$pull": {"milestones": {"id": milestone_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    if not result:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Milestone deleted"}

# ============ ANALYTICS ROUTES ============

@api_router.get("/analytics/overview")
async def get_analytics_overview(current_user = Depends(get_current_user)):
    projects = await db.projects.find({"owner_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    
    total_projects = len(projects)
    active_projects = sum(1 for p in projects if p.get("status") == "active")
    completed_projects = sum(1 for p in projects if p.get("status") == "completed")
    
    total_tasks = sum(len(p.get("tasks", [])) for p in projects)
    completed_tasks = sum(
        sum(1 for t in p.get("tasks", []) if t.get("status") == "done")
        for p in projects
    )
    in_progress_tasks = sum(
        sum(1 for t in p.get("tasks", []) if t.get("status") == "in_progress")
        for p in projects
    )
    
    total_time_minutes = 0
    for p in projects:
        for t in p.get("tasks", []):
            for te in t.get("time_entries", []):
                total_time_minutes += te.get("duration_minutes", 0)
    
    total_milestones = sum(len(p.get("milestones", [])) for p in projects)
    completed_milestones = sum(
        sum(1 for m in p.get("milestones", []) if m.get("completed"))
        for p in projects
    )
    
    # Get upcoming deadlines
    upcoming_deadlines = []
    now = datetime.now(timezone.utc)
    for p in projects:
        if p.get("deadline"):
            try:
                deadline = datetime.fromisoformat(p["deadline"].replace('Z', '+00:00'))
                if deadline > now:
                    upcoming_deadlines.append({
                        "type": "project",
                        "name": p["name"],
                        "deadline": p["deadline"],
                        "project_id": p["id"]
                    })
            except:
                pass
        for m in p.get("milestones", []):
            if not m.get("completed") and m.get("due_date"):
                try:
                    due = datetime.fromisoformat(m["due_date"].replace('Z', '+00:00'))
                    if due > now:
                        upcoming_deadlines.append({
                            "type": "milestone",
                            "name": m["title"],
                            "deadline": m["due_date"],
                            "project_id": p["id"],
                            "project_name": p["name"]
                        })
                except:
                    pass
    
    upcoming_deadlines.sort(key=lambda x: x["deadline"])
    
    return {
        "total_projects": total_projects,
        "active_projects": active_projects,
        "completed_projects": completed_projects,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "in_progress_tasks": in_progress_tasks,
        "todo_tasks": total_tasks - completed_tasks - in_progress_tasks,
        "total_time_hours": round(total_time_minutes / 60, 1),
        "total_milestones": total_milestones,
        "completed_milestones": completed_milestones,
        "upcoming_deadlines": upcoming_deadlines[:5],
        "task_completion_rate": round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1)
    }

@api_router.get("/analytics/time-tracking")
async def get_time_tracking_analytics(current_user = Depends(get_current_user)):
    projects = await db.projects.find({"owner_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    
    # Time per project
    project_times = []
    daily_times = {}
    
    for p in projects:
        project_minutes = 0
        for t in p.get("tasks", []):
            for te in t.get("time_entries", []):
                minutes = te.get("duration_minutes", 0)
                project_minutes += minutes
                date = te.get("date", "")[:10]
                if date:
                    daily_times[date] = daily_times.get(date, 0) + minutes
        
        if project_minutes > 0:
            project_times.append({
                "name": p["name"],
                "hours": round(project_minutes / 60, 1),
                "color": p.get("color", "#4F46E5")
            })
    
    # Convert daily times to sorted list
    daily_list = [
        {"date": date, "hours": round(minutes / 60, 1)}
        for date, minutes in sorted(daily_times.items())
    ][-14:]  # Last 14 days
    
    return {
        "by_project": project_times,
        "daily": daily_list
    }

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
