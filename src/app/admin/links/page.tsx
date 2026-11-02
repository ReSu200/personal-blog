import { FriendLinksManager } from '@/components/friend-links-manager';
import { listFriendLinks } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export const metadata = { title: '友链管理' };

export default async function AdminLinksPage() {
  const links = await listFriendLinks();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">友链管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          维护前台「友链」页展示的站点，可调整顺序或临时隐藏；链接支持 http:// 与 https://
        </p>
      </div>

      <FriendLinksManager
        links={links.map((link) => ({
          id: link.id,
          name: link.name,
          url: link.url,
          description: link.description,
          sortOrder: link.sortOrder,
          isVisible: link.isVisible,
        }))}
      />
    </div>
  );
}
