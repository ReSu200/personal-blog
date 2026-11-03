import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '../confirm-dialog';

type Props = React.ComponentProps<typeof ConfirmDialog>;

/** 默认以「打开态」渲染，用例只覆盖需要变化的字段 */
function setup(overrides: Partial<Props> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const props: Props = {
    open: true,
    title: '确定删除《测试文章》吗？',
    description: '该操作不可恢复。',
    onConfirm,
    onCancel,
    ...overrides,
  };
  const view = render(<ConfirmDialog {...props} />);
  return { ...view, props, onConfirm, onCancel };
}

describe('ConfirmDialog', () => {
  it('open 为 false 时不渲染任何内容', () => {
    setup({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('确定删除《测试文章》吗？')).not.toBeInTheDocument();
  });

  it('渲染标题、描述与取消 / 删除按钮', () => {
    setup();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('确定删除《测试文章》吗？')).toBeInTheDocument();
    expect(screen.getByText('该操作不可恢复。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '删除' })).toBeInTheDocument();
  });

  it('没有描述或错误文案时不渲染多余内容', () => {
    setup({ description: undefined, error: '' });
    const dialog = screen.getByRole('dialog');
    expect(dialog).not.toHaveTextContent('该操作不可恢复。');
    expect(dialog).not.toHaveTextContent('失败');
  });

  it('展示传入的错误文案', () => {
    setup({ error: '文章不存在' });
    expect(screen.getByText('文章不存在')).toBeInTheDocument();
  });

  it('支持自定义确认按钮文案', () => {
    setup({ confirmText: '确认删除' });
    expect(screen.getByRole('button', { name: '确认删除' })).toBeInTheDocument();
  });

  it('点击删除按钮触发 onConfirm', async () => {
    const user = userEvent.setup();
    const { onConfirm } = setup();
    await user.click(screen.getByRole('button', { name: '删除' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('点击取消按钮触发 onCancel', async () => {
    const user = userEvent.setup();
    const { onCancel } = setup();
    await user.click(screen.getByRole('button', { name: '取消' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('点击遮罩层触发 onCancel', () => {
    const { onCancel } = setup();
    fireEvent.click(screen.getByRole('dialog').parentElement as HTMLElement);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('点击弹层内部不会触发 onCancel', async () => {
    const user = userEvent.setup();
    const { onCancel } = setup();
    await user.click(screen.getByText('确定删除《测试文章》吗？'));
    await user.click(screen.getByText('该操作不可恢复。'));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('按下 Esc 触发 onCancel', async () => {
    const user = userEvent.setup();
    const { onCancel } = setup();
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('打开后确认按钮自动获得焦点', () => {
    setup();
    expect(screen.getByRole('button', { name: '删除' })).toHaveFocus();
  });

  it('loading 时禁用按钮、确认文案变为删除中，且 Esc 与遮罩不再取消', async () => {
    const user = userEvent.setup();
    const { onCancel, onConfirm } = setup({ loading: true });
    const confirmButton = screen.getByRole('button', { name: '删除中…' });
    expect(confirmButton).toBeDisabled();
    expect(screen.getByRole('button', { name: '取消' })).toBeDisabled();

    await user.click(confirmButton);
    expect(onConfirm).not.toHaveBeenCalled();

    await user.keyboard('{Escape}');
    expect(onCancel).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('dialog').parentElement as HTMLElement);
    expect(onCancel).not.toHaveBeenCalled();
  });
});
