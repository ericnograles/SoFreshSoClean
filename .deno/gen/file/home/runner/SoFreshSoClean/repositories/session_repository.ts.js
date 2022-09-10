import { Client } from "replit-db";
const db = new Client();
export async function setSession(userId, token) {
    let uuid = crypto.randomUUID();
    let key = `${userId}_${uuid}`;
    await db.set(key, token);
    return key;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vaG9tZS9ydW5uZXIvU29GcmVzaFNvQ2xlYW4vcmVwb3NpdG9yaWVzL3Nlc3Npb25fcmVwb3NpdG9yeS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDbGllbnQgfSBmcm9tIFwicmVwbGl0LWRiXCI7XG5cbmNvbnN0IGRiID0gbmV3IENsaWVudCgpO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2V0U2Vzc2lvbih1c2VySWQ6IHN0cmluZywgdG9rZW46IEF1dGgwVG9rZW5SZXNwb25zZSkge1xuICBsZXQgdXVpZCA9IGNyeXB0by5yYW5kb21VVUlEKCk7XG4gIGxldCBrZXkgPSBgJHt1c2VySWR9XyR7dXVpZH1gO1xuICBhd2FpdCBkYi5zZXQoa2V5LCB0b2tlbik7XG4gIHJldHVybiBrZXk7XG59Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFNBQVMsTUFBTSxRQUFRLFdBQVcsQ0FBQztBQUVuQyxNQUFNLEVBQUUsR0FBRyxJQUFJLE1BQU0sRUFBRSxBQUFDO0FBRXhCLE9BQU8sZUFBZSxVQUFVLENBQUMsTUFBYyxFQUFFLEtBQXlCLEVBQUU7SUFDMUUsSUFBSSxJQUFJLEdBQUcsTUFBTSxDQUFDLFVBQVUsRUFBRSxBQUFDO0lBQy9CLElBQUksR0FBRyxHQUFHLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEFBQUM7SUFDOUIsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN6QixPQUFPLEdBQUcsQ0FBQztDQUNaIn0=