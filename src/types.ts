export interface Task {
  id: string;
  text: string;
  done: boolean;
  dueDate: string | null;
  dependsOn: string[];
  notes: string;
}

export interface ShoppingItem {
  id: string;
  text: string;
  done: boolean;
  store: string;
  notes: string;
}

export interface Project {
  id: string;
  name: string;
  accent: number;
  tasks: Task[];
  shopping: ShoppingItem[];
}

export interface AppData {
  projects: Project[];
  generalShopping: ShoppingItem[];
}
