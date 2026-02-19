import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import practicePulseLogo from "../../img/PracticePulseLogo.png";
import { createPageUrl } from "@/utils";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const noAccessMessage = location.state?.reason === "no-access";

  useEffect(() => {
    if (!selectedUserId && users.length > 0) {
      const first = users[0];
      const value = String(first.user_id ?? first.id ?? "");
      setSelectedUserId(value);
    }
  }, [users, selectedUserId]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const existing = await User.me();
        if (existing) {
          setIsLoading(false);
          const targetRoute = existing?.default_route
            ? createPageUrl(existing.default_route)
            : createPageUrl("UserManagement");
          navigate(targetRoute, { replace: true });
          return;
        }
      } catch (err) {
        // Ignore 401s during boot
      }

      try {
        const loginUsers = await User.listUsersForLogin(['active', 'pending']);
        setUsers(Array.isArray(loginUsers) ? loginUsers : []);
      } catch (err) {
        console.error("Failed to load users for login:", err);
        setError("Unable to load users. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, [navigate]);

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!selectedUserId) return;
    setIsSubmitting(true);
    setError("");
    try {
      const loggedInUser = await User.login(selectedUserId);
      const targetRoute = loggedInUser?.default_route
        ? createPageUrl(loggedInUser.default_route)
        : createPageUrl("UserManagement");
      navigate(targetRoute, { replace: true });
    } catch (err) {
      console.error("Login failed:", err);
      setError(err?.message || "Unable to login. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Card className="shadow-lg border-0">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={practicePulseLogo} alt="In-Kind Tracker" className="h-12 object-contain" />
            </div>
            <CardTitle className="text-2xl font-semibold text-slate-800">Sign in</CardTitle>
            <p className="text-sm text-slate-500 mt-2">Select your user to begin.</p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleLogin}>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">User</label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={isLoading || users.length === 0}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={isLoading ? "Loading users..." : "Choose a user"} />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.user_id ?? user.id} value={String(user.user_id ?? user.id)}>
                        {user.name || user.username}
                        {user.name && user.username ? ` (${user.username})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {noAccessMessage && !error && (
                <p className="text-sm text-amber-600">
                  Your account does not have access to the requested page. Please choose another user.
                </p>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={!selectedUserId || isSubmitting}>
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
